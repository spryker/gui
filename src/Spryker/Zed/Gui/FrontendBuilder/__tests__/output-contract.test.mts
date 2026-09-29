import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, afterEach } from '@jest/globals';
import { cleanDirectories } from '../libs/webpack/clean-dirs.mts';
import { configureEntryPoints } from '../libs/webpack/entry-configurator.mts';
import { MirrorAssetsPlugin } from '../libs/webpack/mirror-assets.mts';

const temporaryRoots: string[] = [];

const createTemporaryRoot = (): string => {
    const root = mkdtempSync(join(tmpdir(), 'zed-builder-output-'));
    temporaryRoots.push(root);

    return root;
};

afterEach(() => {
    while (temporaryRoots.length > 0) {
        rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
});

describe('output directory cleaning', () => {
    it("removes the builder's own subdirectories and leaves a sibling builder's output alone", () => {
        const assetsRoot = join(createTemporaryRoot(), 'public/Backoffice/assets');
        const ownedNames = ['js', 'css', 'fonts', 'img'];

        for (const name of [...ownedNames, 'falcon-ui']) {
            mkdirSync(join(assetsRoot, name), { recursive: true });
            writeFileSync(join(assetsRoot, name, 'marker.txt'), name);
        }

        cleanDirectories(ownedNames.map((name) => join(assetsRoot, name)));

        expect(readdirSync(assetsRoot)).toEqual(['falcon-ui']);
        expect(existsSync(join(assetsRoot, 'falcon-ui/marker.txt'))).toBe(true);
    });

    it('keeps cleaning the remaining directories when an earlier one does not exist', () => {
        const assetsRoot = join(createTemporaryRoot(), 'assets');
        mkdirSync(join(assetsRoot, 'css'), { recursive: true });
        writeFileSync(join(assetsRoot, 'css/old.css'), '');

        cleanDirectories([join(assetsRoot, 'js'), join(assetsRoot, 'css')]);

        expect(existsSync(join(assetsRoot, 'css'))).toBe(false);
    });
});

describe('entry wiring', () => {
    it('makes every entry depend on the shared runtime entry, which carries no runtime itself', () => {
        const entries = configureEntryPoints(
            { 'spryker-zed-gui-commons': '/a/commons.entry.js', 'spryker-zed-tax-main': '/a/tax.entry.js' },
            'spryker-zed-gui-commons',
        );

        expect(entries['spryker-zed-gui-commons']).toEqual({ runtime: false, import: '/a/commons.entry.js' });
        expect(entries['spryker-zed-tax-main']).toEqual({
            dependOn: 'spryker-zed-gui-commons',
            import: '/a/tax.entry.js',
        });
    });

    it('emits the runtime entry first, so webpack resolves every dependOn target', () => {
        const entries = configureEntryPoints(
            { 'spryker-zed-tax-main': '/a/tax.entry.js', 'spryker-zed-gui-commons': '/a/commons.entry.js' },
            'spryker-zed-gui-commons',
        );

        expect(Object.keys(entries)[0]).toBe('spryker-zed-gui-commons');
    });

    it('names the missing runtime entry and where it should live when it was not discovered', () => {
        expect(() => configureEntryPoints({ 'spryker-zed-tax-main': '/a/tax.entry.js' }, 'spryker-zed-gui-commons')) //
            .toThrow(/spryker-zed-gui-commons/);
        expect(() => configureEntryPoints({ 'spryker-zed-tax-main': '/a/tax.entry.js' }, 'spryker-zed-gui-commons')) //
            .toThrow(/assets\/Zed\/js\/spryker-zed-gui-commons\.entry\.js/);
    });
});

describe('public/Zed mirror', () => {
    it('copies the whole output directory, including a sibling builder output', async () => {
        const root = createTemporaryRoot();
        const source = join(root, 'public/Backoffice/assets');
        const target = join(root, 'public/Zed/assets');
        mkdirSync(join(source, 'js'), { recursive: true });
        mkdirSync(join(source, 'falcon-ui'), { recursive: true });
        writeFileSync(join(source, 'js/app.js'), 'app');
        writeFileSync(join(source, 'falcon-ui/main.js'), 'falcon');

        await new MirrorAssetsPlugin(source, target).mirror();

        expect(existsSync(join(target, 'js/app.js'))).toBe(true);
        expect(existsSync(join(target, 'falcon-ui/main.js'))).toBe(true);
    });

    it('replaces the previous mirror instead of merging into it', async () => {
        const root = createTemporaryRoot();
        const source = join(root, 'source');
        const target = join(root, 'target');
        mkdirSync(source, { recursive: true });
        mkdirSync(target, { recursive: true });
        writeFileSync(join(source, 'current.js'), 'current');
        writeFileSync(join(target, 'removed-in-this-build.js'), 'stale');

        await new MirrorAssetsPlugin(source, target).mirror();

        expect(readdirSync(target)).toEqual(['current.js']);
    });

    it('explains why the mirror matters when the build output is missing', async () => {
        const root = createTemporaryRoot();

        await expect(new MirrorAssetsPlugin(join(root, 'missing'), join(root, 'target')).mirror()).rejects.toThrow(
            /mount\.sh/,
        );
    });
});
