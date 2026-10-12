import { basename, join } from 'node:path';
import { describe, it, expect, afterEach } from '@jest/globals';
import { deriveEntryName, findEntryPoints, findFiles } from '../libs/webpack/finder.mts';
import { defineConfig, getAppSettings } from '../settings.mts';
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

describe('entry point discovery in a custom project namespace', () => {
    const createNamespacedProject = (): string =>
        createModuleTree({
            'src/Pyz/Zed/Tax/assets/Zed/js/spryker-zed-tax-main.entry.js': '// Pyz entry',
            'src/Pyz/Zed/PyzOnly/assets/Zed/js/spryker-zed-pyz-only.entry.js': '// Pyz-only entry',
            'src/Acme/Zed/Tax/assets/Zed/js/spryker-zed-tax-main.entry.js': '// custom namespace override',
            'src/Acme/Zed/AcmeOnly/assets/Zed/js/spryker-zed-acme-only.entry.ts': '// custom namespace entry',
        });

    const findProjectEntryPoints = (context: string, sources: Record<string, string>) =>
        findEntryPoints(
            getAppSettings({ ...defineConfig({ paths: { sources } }), context }, 'development').find.entryPoints,
        );

    it('builds the entries of Pyz and of a namespace registered next to it, the later namespace winning a name', async () => {
        const context = createNamespacedProject();

        const entryPoints = await findProjectEntryPoints(context, {
            project: './src/Pyz/Zed',
            acme: './src/Acme/Zed',
        });

        expect(entryPoints['spryker-zed-pyz-only']).toContain(join('src', 'Pyz', 'Zed', 'PyzOnly'));
        expect(entryPoints['spryker-zed-acme-only']).toContain(join('src', 'Acme', 'Zed', 'AcmeOnly'));
        expect(entryPoints['spryker-zed-tax-main']).toContain(join('src', 'Acme', 'Zed', 'Tax'));
    });

    it('builds no Pyz entry once the namespace replaces Pyz under the project key', async () => {
        const context = createNamespacedProject();

        const entryPoints = await findProjectEntryPoints(context, { project: './src/Acme/Zed' });

        expect(Object.keys(entryPoints).sort()).toEqual(['spryker-zed-acme-only', 'spryker-zed-tax-main']);
        expect(entryPoints['spryker-zed-tax-main']).toContain(join('src', 'Acme', 'Zed', 'Tax'));
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
