import { dirname, join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { FindSettings } from './libs/webpack/finder.mts';

// Written by the backend before every build; without it the built-in layout stays in effect.
export const BUILD_CONFIGURATION_PATH = 'data/cache/Zed/frontend/build-config.json';

export interface GeneratedBuildConfiguration {
    /** Strongest first. */
    coreNamespaces: string[];
    projectNamespaces: string[];
}

export const readGeneratedBuildConfiguration = (context: string): GeneratedBuildConfiguration | null => {
    const filePath = join(context, BUILD_CONFIGURATION_PATH);

    if (!existsSync(filePath)) {
        return null;
    }

    const parsed: Partial<GeneratedBuildConfiguration> = JSON.parse(readFileSync(filePath, 'utf8'));

    if (!Array.isArray(parsed.coreNamespaces) || !Array.isArray(parsed.projectNamespaces)) {
        throw new Error(
            `${filePath}: "coreNamespaces" and "projectNamespaces" must be lists of namespace names; ` +
                `regenerate the file with "vendor/bin/console frontend:zed:build".`,
        );
    }

    return parsed as GeneratedBuildConfiguration;
};

const dasherize = (value: string): string => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

// `src/<Namespace>` when the repository holds the modules, the Composer package directory otherwise.
const resolveNamespaceDirectory = (context: string, namespace: string): string =>
    existsSync(join(context, 'src', namespace)) ? `./src/${namespace}` : `./vendor/${dasherize(namespace)}`;

// The keys the rest of the builder reads: `core` (Gui package, legacy aliases, resolve.modules),
// `features` (resolve.modules) and `project` (the key a settings file may replace).
const NAMESPACE_SOURCE_KEYS: Record<string, string> = { Spryker: 'core', SprykerFeature: 'features', Pyz: 'project' };

// The finder lets a later root win, the backend lists the strongest first: both lists are reversed.
const buildGeneratedSources = (context: string, generated: GeneratedBuildConfiguration): Record<string, string> => {
    const sources: Record<string, string> = {};

    [...generated.coreNamespaces, ...generated.projectNamespaces].reverse().forEach((namespace) => {
        sources[NAMESPACE_SOURCE_KEYS[namespace] ?? namespace.toLowerCase()] = resolveNamespaceDirectory(
            context,
            namespace,
        );
    });

    return sources;
};

// Defaults, then the generated file, then the project settings on top: a `paths` value the settings
// changed survives, so a root from `frontend/backoffice.settings.mts` is scanned after the generated ones.
export const applyGeneratedBuildConfiguration = (
    settings: GlobalSettings,
    generated: GeneratedBuildConfiguration | null,
): GlobalSettings => {
    if (generated === null) {
        return settings;
    }

    const projectSources = Object.fromEntries(
        Object.entries(settings.paths.sources).filter(
            ([key, root]) => defaultGlobalSettings.paths.sources[key] !== root,
        ),
    );

    return {
        ...settings,
        paths: {
            ...settings.paths,
            sources: { ...buildGeneratedSources(settings.context, generated), ...projectSources },
        },
        generatedBuildConfiguration: generated,
        buildConfigurationSource: `generated (${join(settings.context, BUILD_CONFIGURATION_PATH)})`,
    };
};

export interface SourceLayout {
    name: string;
    marker: string;
    guiFolder: string;
    sources: Record<string, string>;
    typecheck: boolean;
}

export interface GlobalSettings {
    context: string;
    modes: { dev: string; watch: string; prod: string };
    runtimeEntryName: string;
    guiFolder: string;
    paths: {
        sourcePath: string;
        publicDir: string;
        /** Legacy mirror; `docker-sdk`'s mount.sh gates "[BUILT]" on it, so it cannot be dropped. */
        mirrorDir: string;
        outputDirectoryNames: string[];
        sources: Record<string, string>;
    };
    /** Whether `lint` also runs the TypeScript compiler over the Back Office sources. */
    typecheck: boolean;
    expectedModeArgument: number;
    generatedBuildConfiguration: GeneratedBuildConfiguration | null;
    buildConfigurationSource: string;
}

export interface AppSettings {
    context: string;
    guiFolder: string;
    runtimeEntryName: string;
    isProductionMode: boolean;
    isWatchMode: boolean;
    paths: GlobalSettings['paths'];
    find: {
        entryPoints: FindSettings;
        resolveModules: FindSettings;
    };
}

interface DefineConfigOverrides {
    paths?: {
        sources?: Record<string, string>;
        publicDir?: string;
        mirrorDir?: string;
    };
    typecheck?: boolean;
}

// The fallback without a generated file. A later root overrides an earlier one, so `project` is last.
const monorepoSourceLayout: SourceLayout = {
    name: 'monorepo (modules in src/)',
    marker: 'src/Spryker',
    guiFolder: 'Gui',
    sources: {
        core: './src/Spryker',
        eco: './vendor/spryker-eco',
        sdk: './vendor/spryker-sdk',
        features: './src/SprykerFeature',
        project: './src/Pyz/*/src/Pyz/Zed',
    },
    typecheck: true,
};

const projectSourceLayout: SourceLayout = {
    name: 'project (modules in vendor/)',
    marker: 'vendor/spryker',
    guiFolder: 'gui',
    sources: {
        core: './vendor/spryker',
        eco: './vendor/spryker-eco',
        sdk: './vendor/spryker-sdk',
        features: './vendor/spryker-feature',
        project: './src/Pyz/Zed',
    },
    // Off by default: a project's own sources were never type-checked, so turning it on in a minor
    // release would fail the project's lint on code nobody changed.
    typecheck: false,
};

// The builder sits under a `Zed/` path, so the entry patterns would otherwise reach its files.
export const BUILDER_EXCLUSION_PATTERN = '!**/Zed/Gui/FrontendBuilder/**';

export const sourceLayouts: SourceLayout[] = [monorepoSourceLayout, projectSourceLayout];

export const BUILDER_MODULE_RELATIVE_DIRECTORY = 'src/Spryker/Zed/Gui/FrontendBuilder';

// Source roots under this prefix are installed third-party code, which this repository does not type-check.
export const VENDOR_SOURCE_PREFIX = './vendor/';

export const RUNTIME_ENTRY_NAME = 'spryker-zed-gui-commons';

export const resolveProjectRoot = (startDirectory: string = process.cwd()): string => {
    let currentDirectory = resolve(startDirectory);

    for (;;) {
        if (existsSync(join(currentDirectory, 'package-lock.json'))) {
            return currentDirectory;
        }

        const parentDirectory = dirname(currentDirectory);

        if (parentDirectory === currentDirectory) {
            throw new Error(
                `Cannot locate the Back Office project root above ${resolve(startDirectory)}: no ancestor ` +
                    `directory contains a "package-lock.json".\n` +
                    `The builder resolves every module path from the project root, which it finds by ` +
                    `walking up from the working directory.\n` +
                    `Run the command from inside the project, and run "npm install" first if the ` +
                    `lockfile is missing.\n`,
            );
        }

        currentDirectory = parentDirectory;
    }
};

export const resolveSourceLayout = (context: string = resolveProjectRoot()): SourceLayout => {
    if (existsSync(join(context, monorepoSourceLayout.marker))) {
        return monorepoSourceLayout;
    }

    if (existsSync(join(context, projectSourceLayout.marker))) {
        return projectSourceLayout;
    }

    throw new Error(
        `Cannot determine the Back Office source layout for ${context}: neither ` +
            `"${monorepoSourceLayout.marker}" (${monorepoSourceLayout.name}) nor ` +
            `"${projectSourceLayout.marker}" (${projectSourceLayout.name}) exists there.\n` +
            `The builder resolves every entry point relative to the project root, so it must run from ` +
            `there.\n` +
            `Run the build from the project root, install composer dependencies if vendor/ is missing, ` +
            `or declare the source directories explicitly in ./frontend/backoffice.settings.mts via ` +
            `defineConfig({ paths: { sources: { … } } }).\n`,
    );
};

const detectedSourceLayout = resolveSourceLayout();

export const defaultGlobalSettings: GlobalSettings = {
    context: resolveProjectRoot(),

    modes: {
        dev: 'development',
        watch: 'development-watch',
        prod: 'production',
    },

    runtimeEntryName: RUNTIME_ENTRY_NAME,
    guiFolder: detectedSourceLayout.guiFolder,

    paths: {
        sourcePath: './assets/Zed/',
        publicDir: './public/Backoffice/assets',
        mirrorDir: './public/Zed/assets',
        outputDirectoryNames: ['js', 'css', 'fonts', 'img'],
        sources: detectedSourceLayout.sources,
    },

    typecheck: detectedSourceLayout.typecheck,

    expectedModeArgument: 2,

    generatedBuildConfiguration: null,
    buildConfigurationSource: `built-in defaults (no ${BUILD_CONFIGURATION_PATH}; the backend generates it)`,
};

export const defineConfig = (overrides: DefineConfigOverrides = {}): GlobalSettings => ({
    ...defaultGlobalSettings,
    typecheck: overrides.typecheck ?? defaultGlobalSettings.typecheck,
    paths: {
        ...defaultGlobalSettings.paths,
        sources: {
            ...defaultGlobalSettings.paths.sources,
            ...(overrides.paths?.sources ?? {}),
        },
        publicDir: overrides.paths?.publicDir ?? defaultGlobalSettings.paths.publicDir,
        mirrorDir: overrides.paths?.mirrorDir ?? defaultGlobalSettings.paths.mirrorDir,
    },
});

export const PROJECT_SETTINGS_RELATIVE_PATH = 'frontend/backoffice.settings.mts';

export const loadProjectGlobalSettings = async (): Promise<GlobalSettings> => {
    const projectOverridePath = join(resolveProjectRoot(), PROJECT_SETTINGS_RELATIVE_PATH);

    const generated = readGeneratedBuildConfiguration(defaultGlobalSettings.context);

    if (!existsSync(projectOverridePath)) {
        return applyGeneratedBuildConfiguration(defaultGlobalSettings, generated);
    }

    try {
        const { default: projectSettings } = await import(pathToFileURL(projectOverridePath).href);

        return applyGeneratedBuildConfiguration(projectSettings as GlobalSettings, generated);
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);

        throw new Error(
            `Failed to load project builder settings from ${projectOverridePath}: ${reason}. ` +
                `Node runs this file directly via TypeScript type stripping, so it must use only erasable ` +
                `TypeScript syntax — no enum, no namespace, no constructor parameter properties (they fail ` +
                `at runtime). Use only erasable TypeScript syntax, or check the file for syntax errors.`,
        );
    }
};

export const getAppSettings = (globalSettings: GlobalSettings, mode: string): AppSettings => {
    const sourceDirectoryList = Object.values(globalSettings.paths.sources).map((sourceRoot) =>
        join(globalSettings.context, sourceRoot),
    );

    return {
        context: globalSettings.context,
        guiFolder: globalSettings.guiFolder,
        runtimeEntryName: globalSettings.runtimeEntryName,
        isProductionMode: mode === globalSettings.modes.prod,
        isWatchMode: mode === globalSettings.modes.watch,
        paths: globalSettings.paths,
        find: {
            entryPoints: {
                dirs: sourceDirectoryList,
                patterns: [
                    '**/Zed/**/*.entry.js',
                    '**/Zed/**/*.entry.ts',
                    '!**/node_modules/**',
                    BUILDER_EXCLUSION_PATTERN,
                ],
            },
            resolveModules: {
                dirs: sourceDirectoryList,
                patterns: ['**/Zed/node_modules'],
                globSettings: { onlyFiles: false, onlyDirectories: true },
            },
        },
    };
};
