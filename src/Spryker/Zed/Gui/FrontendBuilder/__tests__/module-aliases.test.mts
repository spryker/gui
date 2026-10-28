import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from '@jest/globals';
import { defineConfig, getSourceRoots, sourceLayouts, type GlobalSettings } from '../settings.mts';
import type { PathAliasMap } from '../libs/aliases/alias-provider.mts';
import { createModuleAliasProvider } from '../libs/aliases/module-aliases.mts';

const temporaryRoots: string[] = [];

const createRootWith = (directories: string[]): string => {
    const root = mkdtempSync(join(tmpdir(), 'zed-builder-module-aliases-'));
    temporaryRoots.push(root);
    directories.forEach((directory) => mkdirSync(join(root, directory), { recursive: true }));

    return root;
};

const settingsFor = (context: string): GlobalSettings => ({ ...defineConfig(), context });

const collectAliases = (settings: GlobalSettings): Promise<PathAliasMap> =>
    createModuleAliasProvider(settings).collect(getSourceRoots(settings));

afterEach(() => {
    while (temporaryRoots.length > 0) {
        rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
});

describe('the module aliases', () => {
    it('generates one @zed alias per discovered module, kebab-cased', async () => {
        const aliases = await collectAliases(
            settingsFor(createRootWith(['src/Spryker/Tax/assets/Zed', 'src/Spryker/ProductRelationGui/assets/Zed'])),
        );

        expect(aliases['@zed/product-relation-gui/*']).toEqual(['./src/Spryker/ProductRelationGui/assets/Zed/*']);
        expect(aliases['@zed/tax/*']).toEqual(['./src/Spryker/Tax/assets/Zed/*']);
    });

    it('names the alias of a monorepo project module after the module, not after the Zed layer', async () => {
        const aliases = await collectAliases(
            settingsFor(createRootWith(['src/Pyz/PriceFormatting/src/Pyz/Zed/PriceFormatting/assets/Zed'])),
        );

        expect(aliases['@zed/price-formatting/*']).toEqual([
            './src/Pyz/PriceFormatting/src/Pyz/Zed/PriceFormatting/assets/Zed/*',
        ]);
        expect(aliases['@zed/zed/*']).toBeUndefined();
    });

    it('keeps the three legacy aliases, in both the bare and the prefix form webpack needs', async () => {
        const aliases = await collectAliases(settingsFor(createRootWith(['src/Spryker/Gui/assets/Zed'])));

        expect(aliases.ZedGui).toEqual(['./src/Spryker/Gui/assets/Zed/js/modules/commons']);
        expect(aliases['ZedGuiModules/*']).toEqual(['./src/Spryker/Gui/assets/Zed/js/modules/*']);
        expect(aliases.ZedGuiEditorConfiguration).toBeDefined();
    });

    it('owns the @zed and the legacy alias names only', () => {
        const moduleAliasProvider = createModuleAliasProvider(defineConfig());

        expect(moduleAliasProvider.ownsAliasName('@zed/tax/*')).toBe(true);
        expect(moduleAliasProvider.ownsAliasName('ZedGuiModules/*')).toBe(true);
        expect(moduleAliasProvider.ownsAliasName('@shared/ai-commerce/*')).toBe(false);
        expect(moduleAliasProvider.ownsAliasName('MyProjectThing/*')).toBe(false);
    });
});

describe('the module aliases of a custom project namespace', () => {
    const namespacedSettingsFor = (sources: Record<string, string>): GlobalSettings => {
        const settings = defineConfig();
        const projectLayout = sourceLayouts[1];

        return {
            ...settings,
            context: createRootWith([
                'vendor/spryker/tax/assets/Zed',
                'src/Pyz/Zed/Tax/assets/Zed',
                'src/Pyz/Zed/PyzOnly/assets/Zed',
                'src/Acme/Zed/Tax/assets/Zed',
                'src/Acme/Zed/AcmeOnly/assets/Zed',
            ]),
            guiFolder: projectLayout.guiFolder,
            paths: { ...settings.paths, sources: { ...projectLayout.sources, ...sources } },
        };
    };

    it('aliases the modules of Pyz and of a namespace registered next to it', async () => {
        const aliases = await collectAliases(namespacedSettingsFor({ acme: './src/Acme/Zed' }));

        expect(aliases['@zed/pyz-only/*']).toEqual(['./src/Pyz/Zed/PyzOnly/assets/Zed/*']);
        expect(aliases['@zed/acme-only/*']).toEqual(['./src/Acme/Zed/AcmeOnly/assets/Zed/*']);
    });

    it('points the alias of a module both namespaces contain at the later namespace only, as a whole', async () => {
        const aliases = await collectAliases(namespacedSettingsFor({ acme: './src/Acme/Zed' }));

        expect(aliases['@zed/tax/*']).toEqual(['./src/Acme/Zed/Tax/assets/Zed/*']);
    });
});
