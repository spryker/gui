import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, afterEach } from '@jest/globals';
import { defineConfig, getAppSettings, resolveProjectRoot, resolveSourceLayout } from '../settings.mts';

const temporaryRoots: string[] = [];

const createTemporaryRoot = (): string => {
    const root = mkdtempSync(join(tmpdir(), 'zed-builder-settings-'));
    temporaryRoots.push(root);

    return root;
};

afterEach(() => {
    while (temporaryRoots.length > 0) {
        rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
});

describe('source layout detection', () => {
    it('detects the monorepo layout from src/Spryker', () => {
        const root = createTemporaryRoot();
        mkdirSync(join(root, 'src/Spryker'), { recursive: true });

        const layout = resolveSourceLayout(root);

        expect(layout.name).toBe('monorepo (modules in src/)');
        expect(layout.guiFolder).toBe('Gui');
        expect(layout.sources.project).toBe('./src/Pyz/*/src/Pyz/Zed');
    });

    it('detects the project layout from vendor/spryker', () => {
        const root = createTemporaryRoot();
        mkdirSync(join(root, 'vendor/spryker'), { recursive: true });

        const layout = resolveSourceLayout(root);

        expect(layout.name).toBe('project (modules in vendor/)');
        expect(layout.guiFolder).toBe('gui');
        expect(layout.sources.project).toBe('./src/Pyz/Zed');
    });

    it('fails with the directory, the reason and the next action when neither marker exists', () => {
        const root = createTemporaryRoot();

        expect(() => resolveSourceLayout(root)).toThrow(root);
        expect(() => resolveSourceLayout(root)).toThrow(/neither "src\/Spryker".*nor "vendor\/spryker"/s);
        expect(() => resolveSourceLayout(root)).toThrow(/backoffice\.settings\.mts/);
    });
});

describe('project root resolution', () => {
    it('walks up to the directory holding package-lock.json', () => {
        const root = createTemporaryRoot();
        const nested = join(root, 'a', 'b', 'c');
        mkdirSync(nested, { recursive: true });
        writeFileSync(join(root, 'package-lock.json'), '{}');

        expect(resolveProjectRoot(nested)).toBe(root);
    });

    it('fails with the start directory, the reason and the next action when no lockfile exists above', () => {
        const root = createTemporaryRoot();

        expect(() => resolveProjectRoot(root)).toThrow(/no ancestor/);
        expect(() => resolveProjectRoot(root)).toThrow(/npm install/);
    });
});

describe('project configuration overrides', () => {
    it('merges overridden source roots over the defaults and keeps the rest', () => {
        const globalSettings = defineConfig({ paths: { sources: { project: './custom/Zed' } } });

        expect(globalSettings.paths.sources.project).toBe('./custom/Zed');
        expect(globalSettings.paths.sources.core).toBeDefined();
        expect(globalSettings.paths.publicDir).toBe('./public/Backoffice/assets');
    });
});

describe('application settings', () => {
    it('marks production mode only for the production build', () => {
        const globalSettings = defineConfig();

        expect(getAppSettings(globalSettings, 'production').isProductionMode).toBe(true);
        expect(getAppSettings(globalSettings, 'development').isProductionMode).toBe(false);
        expect(getAppSettings(globalSettings, 'development-watch').isWatchMode).toBe(true);
    });

    it("excludes the builder's own test fixtures from entry discovery", () => {
        const appSettings = getAppSettings(defineConfig(), 'development');

        expect(appSettings.find.entryPoints.patterns).toContain('!**/Zed/Gui/FrontendBuilder/**');
    });
});
