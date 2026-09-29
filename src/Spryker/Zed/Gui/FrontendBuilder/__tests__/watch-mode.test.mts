import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, afterEach } from '@jest/globals';
import {
    MANIFEST_FILENAME,
    createTwigVersionHolder,
    hashEmittedAssets,
    writeDevBuildManifest,
} from '../libs/reload/manifest-writer.mts';
import { createDebouncedTwigBump, resolvePresentationWatchDirectories } from '../libs/reload/twig-watcher.mts';

const temporaryRoots: string[] = [];

const createTemporaryRoot = (): string => {
    const root = mkdtempSync(join(tmpdir(), 'zed-builder-watch-'));
    temporaryRoots.push(root);

    return root;
};

afterEach(() => {
    while (temporaryRoots.length > 0) {
        rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
});

describe('the manifest the client polls', () => {
    it('hashes the emitted js and css and ignores source maps', () => {
        const output = createTemporaryRoot();
        mkdirSync(join(output, 'js'), { recursive: true });
        mkdirSync(join(output, 'css'), { recursive: true });
        writeFileSync(join(output, 'js/app.js'), 'app');
        writeFileSync(join(output, 'js/app.js.map'), '{}');
        writeFileSync(join(output, 'css/app.css'), '.a{}');

        expect(Object.keys(hashEmittedAssets(output)).sort()).toEqual(['css/app.css', 'js/app.js']);
    });

    it('leaves no temporary file behind, so a polling client never reads a half-written manifest', () => {
        const output = createTemporaryRoot();

        writeDevBuildManifest(output, { buildId: 3, twigVersion: 1, assets: {} });

        const manifest = JSON.parse(readFileSync(join(output, MANIFEST_FILENAME), 'utf8'));
        expect(manifest.buildId).toBe(3);
        expect(existsSync(join(output, `${MANIFEST_FILENAME}.tmp`))).toBe(false);
    });
});

describe('a burst of template saves', () => {
    it('bumps the version once, so one editor save is one reload', async () => {
        const twigVersionHolder = createTwigVersionHolder();
        let rewriteCount = 0;
        const bump = createDebouncedTwigBump({
            twigVersionHolder,
            rewriteManifest: () => {
                rewriteCount += 1;
            },
        });

        bump('/a/Zed/Module/Presentation/Index/index.twig');
        bump('/a/Zed/Module/Presentation/Index/index.twig');
        bump('/a/Zed/Module/Presentation/Index/other.twig');
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(twigVersionHolder.value).toBe(1);
        expect(rewriteCount).toBe(1);
    });

    it('ignores a file that is not a Back Office template', async () => {
        const twigVersionHolder = createTwigVersionHolder();
        const bump = createDebouncedTwigBump({ twigVersionHolder, rewriteManifest: () => {} });

        bump('/a/Zed/Module/Presentation/Index/index.css');
        bump('/a/SprykerShop/Yves/Module/Theme/default/template.twig');
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(twigVersionHolder.value).toBe(0);
    });
});

describe('choosing what to watch', () => {
    it('narrows a source root to the Presentation directories that actually hold templates', async () => {
        const root = createTemporaryRoot();
        mkdirSync(join(root, 'ModuleA/src/Spryker/Zed/ModuleA/Presentation/Index'), { recursive: true });
        mkdirSync(join(root, 'ModuleB/assets/Zed/js'), { recursive: true });

        const directories = await resolvePresentationWatchDirectories([root]);

        expect(directories).toHaveLength(1);
        expect(directories[0]).toContain(join('ModuleA', 'src', 'Spryker', 'Zed', 'ModuleA', 'Presentation'));
    });
});
