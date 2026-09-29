import { basename, join } from 'node:path';
import { describe, it, expect, afterEach } from '@jest/globals';
import { deriveEntryName, findEntryPoints, findFiles } from '../libs/webpack/finder.mts';
import { createModuleTree, removeCreatedModuleTrees } from './helpers/module-tree.mts';

const entryPatterns = ['**/Zed/**/*.entry.js', '**/Zed/**/*.entry.ts', '!**/node_modules/**'];

const createCoreRoot = (): string =>
    createModuleTree({
        'ModuleA/assets/Zed/js/spryker-zed-alpha.entry.js': '// legacy entry',
        'ModuleA/assets/Zed/js/spryker-zed-beta.entry.ts': '// typescript entry',
        'ModuleB/assets/Zed/js/spryker-zed-gui-commons.entry.js': '// shared runtime entry',
        'ModuleB/assets/Zed/node_modules/some-package/index.js': '',
        'ModuleC/assets/Zed/js/node_modules/spryker-zed-vendor.entry.js': '// must never be discovered',
    });

const createProjectRoot = (): string =>
    createModuleTree({
        'PyzModule/assets/Zed/js/spryker-zed-alpha.entry.js': '// project override of a core name',
    });

afterEach(removeCreatedModuleTrees);

describe('entry name derivation', () => {
    it('strips the .entry.js suffix', () => {
        expect(deriveEntryName('/a/b/spryker-zed-tax-main.entry.js')).toBe('spryker-zed-tax-main');
    });

    it('strips the .entry.ts suffix, which basename() with a literal suffix cannot do', () => {
        expect(deriveEntryName('/a/b/spryker-zed-tax-main.entry.ts')).toBe('spryker-zed-tax-main');
        expect(basename('/a/b/spryker-zed-tax-main.entry.ts', '.entry.js')).toBe('spryker-zed-tax-main.entry.ts');
    });

    it('names the offending file and the required rename when the suffix is absent', () => {
        expect(() => deriveEntryName('/a/b/not-an-entry.js')).toThrow(/\/a\/b\/not-an-entry\.js/);
        expect(() => deriveEntryName('/a/b/not-an-entry.js')).toThrow(/does not end in "\.entry\.js"/);
        expect(() => deriveEntryName('/a/b/not-an-entry.js')).toThrow(/Rename the file/);
    });
});

describe('entry point discovery', () => {
    it('finds legacy .entry.js and new .entry.ts files under any Zed asset directory', async () => {
        const entryPoints = await findEntryPoints({ dirs: [createCoreRoot()], patterns: entryPatterns });

        expect(Object.keys(entryPoints).sort()).toEqual([
            'spryker-zed-alpha',
            'spryker-zed-beta',
            'spryker-zed-gui-commons',
        ]);
    });

    it('never discovers an entry inside a node_modules directory', async () => {
        const entryPoints = await findEntryPoints({ dirs: [createCoreRoot()], patterns: entryPatterns });

        expect(Object.keys(entryPoints)).not.toContain('spryker-zed-vendor');
    });

    it('lets a project entry replace a core entry of the same name, because project resolves last', async () => {
        const entryPoints = await findEntryPoints({
            dirs: [createCoreRoot(), createProjectRoot()],
            patterns: entryPatterns,
        });

        expect(entryPoints['spryker-zed-alpha']).toContain(join('PyzModule', 'assets'));
    });

    it('keeps the core entry when the core root is declared last', async () => {
        const entryPoints = await findEntryPoints({
            dirs: [createProjectRoot(), createCoreRoot()],
            patterns: entryPatterns,
        });

        expect(entryPoints['spryker-zed-alpha']).toContain(join('ModuleA', 'assets'));
    });
});

describe('resolve.modules discovery', () => {
    it('finds the per-module Zed node_modules directories the legacy runtime dependencies live in', async () => {
        const directories = await findFiles({
            dirs: [createCoreRoot()],
            patterns: ['**/Zed/node_modules'],
            globSettings: { onlyFiles: false, onlyDirectories: true },
        });

        expect(directories).toHaveLength(1);
        expect(directories[0]).toContain(join('ModuleB', 'assets', 'Zed', 'node_modules'));
    });
});
