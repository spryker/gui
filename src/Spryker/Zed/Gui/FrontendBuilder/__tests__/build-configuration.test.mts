import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from '@jest/globals';
import {
    BUILD_CONFIGURATION_PATH,
    applyGeneratedBuildConfiguration,
    defineConfig,
    readGeneratedBuildConfiguration,
    type GeneratedBuildConfiguration,
} from '../settings.mts';

const temporaryRoots: string[] = [];

// A monorepo-shaped project: Spryker, SprykerShop and SprykerFeature sources in src/, SprykerEco and
// SprykerSdk installed under vendor/, two project namespaces.
const createContext = (): string => {
    const context = mkdtempSync(join(tmpdir(), 'zed-build-configuration-'));
    temporaryRoots.push(context);
    ['src/Spryker', 'src/SprykerShop', 'src/SprykerFeature', 'src/Pyz', 'src/Acme'].forEach((directory) =>
        mkdirSync(join(context, directory), { recursive: true }),
    );

    return context;
};

const writeFile = (context: string, relativePath: string, content: unknown): string => {
    const filePath = join(context, relativePath);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content));

    return filePath;
};

const generated: GeneratedBuildConfiguration = {
    coreNamespaces: ['SprykerShop', 'SprykerFeature', 'SprykerEco', 'Spryker', 'SprykerSdk'],
    projectNamespaces: ['Acme', 'Pyz'],
};

const settingsFor = (context: string, overrides: Parameters<typeof defineConfig>[0] = {}) => ({
    ...defineConfig(overrides),
    context,
});

afterEach(() => {
    while (temporaryRoots.length > 0) {
        rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
});

describe('reading the generated build configuration', () => {
    it('returns null when the backend has not written the file, so the built-in layout stays', () => {
        expect(readGeneratedBuildConfiguration(createContext())).toBeNull();
    });

    it('reads the file at its fixed path', () => {
        const context = createContext();
        writeFile(context, BUILD_CONFIGURATION_PATH, generated);

        expect(readGeneratedBuildConfiguration(context)).toEqual(generated);
    });

    it('fails when the file is not valid JSON', () => {
        const context = createContext();
        writeFile(context, BUILD_CONFIGURATION_PATH, '{ not json');

        expect(() => readGeneratedBuildConfiguration(context)).toThrow(SyntaxError);
    });

    it('fails naming the file when the namespace lists are missing', () => {
        const context = createContext();
        const filePath = writeFile(context, BUILD_CONFIGURATION_PATH, { coreNamespaces: 'Spryker' });

        expect(() => readGeneratedBuildConfiguration(context)).toThrow(filePath);
        expect(() => readGeneratedBuildConfiguration(context)).toThrow('"coreNamespaces" and "projectNamespaces"');
    });
});

describe('applying the generated build configuration', () => {
    it('keeps the settings untouched without a file', () => {
        const settings = settingsFor(createContext());

        expect(applyGeneratedBuildConfiguration(settings, null)).toBe(settings);
    });

    it('scans every namespace weakest first, src/ when the repository holds it and vendor/ otherwise, under the built-in keys', () => {
        const settings = applyGeneratedBuildConfiguration(settingsFor(createContext()), generated);

        // Entries, not the object: `toEqual` on an object ignores key order, and the order is the precedence.
        expect(Object.entries(settings.paths.sources)).toEqual([
            ['sprykersdk', './vendor/spryker-sdk'],
            ['core', './src/Spryker'],
            ['sprykereco', './vendor/spryker-eco'],
            ['features', './src/SprykerFeature'],
            ['sprykershop', './src/SprykerShop'],
            ['project', './src/Pyz'],
            ['acme', './src/Acme'],
        ]);
    });

    it('resolves every core namespace to vendor/ in a project checkout', () => {
        const context = createContext();
        ['src/Spryker', 'src/SprykerShop', 'src/SprykerFeature'].forEach((directory) =>
            rmSync(join(context, directory), { recursive: true }),
        );

        const settings = applyGeneratedBuildConfiguration(settingsFor(context), generated);

        expect(settings.paths.sources.core).toBe('./vendor/spryker');
        expect(settings.paths.sources.features).toBe('./vendor/spryker-feature');
        expect(settings.paths.sources.sprykershop).toBe('./vendor/spryker-shop');
    });

    it('keeps the roots a project settings file registered, after the generated ones', () => {
        const settings = applyGeneratedBuildConfiguration(
            settingsFor(createContext(), { paths: { sources: { beta: './src/Beta/Zed' } } }),
            generated,
        );

        expect(Object.entries(settings.paths.sources).at(-1)).toEqual(['beta', './src/Beta/Zed']);
        expect(settings.paths.publicDir).toBe('./public/Backoffice/assets');
    });
});
