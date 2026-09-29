import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
    BUILDER_MODULE_RELATIVE_DIRECTORY,
    VENDOR_SOURCE_PREFIX,
    sourceLayouts,
    type GlobalSettings,
    type SourceLayout,
} from '../../settings.mts';
import { buildParentDirectoryLadder, buildRelativeReference, joinConfigurationPath } from './configuration-path.mts';
import {
    buildGeneratedModulePathAliases,
    buildLegacyPathAliases,
    mergeModulePathAliases,
    sortPathAliases,
    toRelativeAliasValues,
    type ModulePathAliases,
} from './module-path-aliases.mts';
import { readConfigurationFile, reconcileEntryList, type TypeScriptConfiguration } from './configuration-file.mts';
import {
    PROJECT_CONFIGURATION_FILE_NAME,
    reconcileSolutionConfiguration,
    type SolutionReconciliation,
} from './solution-configuration.mts';

export const BUILD_CONFIGURATION_FILE_NAME = 'tsconfig.zed.json';
export const LINT_CONFIGURATION_FILE_NAME = 'tsconfig.zed.lint.json';
export const DEFAULTS_CONFIGURATION_FILE_NAME = 'tsconfig.defaults.json';

// Formerly the project root tsconfig.json; the root now only carries what a project overrides.
const SHARED_COMPILER_OPTIONS: Record<string, unknown> = {
    sourceMap: true,
    noImplicitAny: false,
    declaration: false,
    emitDecoratorMetadata: true,
    experimentalDecorators: true,
    noEmitHelpers: true,
    importHelpers: true,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    removeComments: true,
    useDefineForClassFields: false,
    moduleResolution: 'bundler',
    target: 'es2020',
    module: 'esnext',
    lib: ['dom', 'esnext'],
    strict: false,
};

const SHARED_EXCLUDED_PATHS = ['**/node_modules/**', '**/*.spec.ts', '**/*.test.ts', 'public', 'dist', '**/dist/**'];

const BACK_OFFICE_COMPILER_OPTIONS: Record<string, unknown> = {
    // The shared defaults set `strict: false` for legacy Yves sources; Back Office TypeScript is new code.
    strict: true,
    // A migrating module imports its legacy JavaScript; without this the import fails with TS7016.
    allowJs: true,
    checkJs: false,
    // The shared defaults set `noImplicitAny: false` explicitly, which overrides what `strict` implies.
    noImplicitAny: true,
    moduleResolution: 'bundler',
    module: 'esnext',
    target: 'es2020',
    lib: ['dom', 'esnext'],
    noEmit: true,
};

const AMBIENT_TYPES_MODULE_RELATIVE_PATH = 'assets/Zed/types';

const EXCLUDED_PATHS = ['**/node_modules/**', '**/Zed/Gui/FrontendBuilder/**'];

export interface ReconciledTypeScriptConfiguration {
    fileName: string;
    filePath: string;
    configurationPath: string;
    configuration: TypeScriptConfiguration;
    wasCreated: boolean;
}

// A same-named file in the project root is edited in place instead: a project that customised it keeps owning it.
type ConfigurationLocation = 'projectRoot' | 'builder';

const resolveConfigurationLocation = (context: string, fileName: string): ConfigurationLocation =>
    existsSync(join(context, fileName)) ? 'projectRoot' : 'builder';

const buildBuilderDirectory = (layout: SourceLayout): string =>
    joinConfigurationPath(layout.sources.core, layout.guiFolder, BUILDER_MODULE_RELATIVE_DIRECTORY);

// `.ts` only: the legacy Back Office sources stay JavaScript for backward compatibility.
const buildIncludePatterns = (sourceRoots: string[]): string[] =>
    sourceRoots.map((sourceRoot) => joinConfigurationPath(sourceRoot, '**', 'assets/Zed/**/*.ts'));

const buildAmbientTypesInclude = (layout: SourceLayout): string =>
    joinConfigurationPath(layout.sources.core, layout.guiFolder, AMBIENT_TYPES_MODULE_RELATIVE_PATH, '**/*.d.ts');

/** `directory` is what the file's relative `paths` resolve against; the webpack aliases need it. */
export const resolveBuildConfigurationLocation = (
    context: string,
): { configurationPath: string; filePath: string; directory: string } => {
    const layout = sourceLayouts.find((candidate) => existsSync(join(context, candidate.marker)));
    const isProjectRootCopy =
        layout === undefined || resolveConfigurationLocation(context, BUILD_CONFIGURATION_FILE_NAME) === 'projectRoot';
    const directory = isProjectRootCopy ? '' : buildBuilderDirectory(layout);
    const configurationPath = joinConfigurationPath(directory, BUILD_CONFIGURATION_FILE_NAME);

    return { configurationPath, filePath: join(context, configurationPath), directory };
};

export const resolveLintConfigurationPath = (context: string): string => {
    const layout = sourceLayouts.find((candidate) => existsSync(join(context, candidate.marker)));
    const isProjectRootCopy =
        layout === undefined || resolveConfigurationLocation(context, LINT_CONFIGURATION_FILE_NAME) === 'projectRoot';

    return joinConfigurationPath(isProjectRootCopy ? '' : buildBuilderDirectory(layout), LINT_CONFIGURATION_FILE_NAME);
};

interface ConfigurationReferences {
    parentDirectoryLadder: string;
    buildConfiguration: string;
}

const detectSourceLayout = (context: string): SourceLayout => {
    const layout = sourceLayouts.find((candidate) => existsSync(join(context, candidate.marker)));

    if (layout === undefined) {
        throw new Error(
            `Cannot reconcile the Back Office TypeScript configurations for ${context}: no ` +
                `known source layout marker exists there.\n` +
                `The generated "paths" and "include" sections differ per layout, so the layout has to be ` +
                `known before anything is written.\n` +
                `Run the command from the project root, and install composer dependencies if vendor/ is ` +
                `missing.\n`,
        );
    }

    return layout;
};

// The project root comes last, so the options a project sets there override the builder defaults.
const buildGeneratedExtends = (parentDirectoryLadder: string): string[] => [
    `./${DEFAULTS_CONFIGURATION_FILE_NAME}`,
    buildRelativeReference(parentDirectoryLadder, PROJECT_CONFIGURATION_FILE_NAME),
];

const buildDefaultBuildConfiguration = ({
    parentDirectoryLadder,
}: ConfigurationReferences): TypeScriptConfiguration => ({
    extends: buildGeneratedExtends(parentDirectoryLadder),
    compilerOptions: {},
    include: [],
    exclude: [
        ...EXCLUDED_PATHS,
        ...['public', 'dist'].map((excludedPath) => joinConfigurationPath(parentDirectoryLadder, excludedPath)),
    ],
});

const buildDefaultLintConfiguration = ({ buildConfiguration }: ConfigurationReferences): TypeScriptConfiguration => ({
    extends: buildConfiguration,
    include: [],
});

interface ConfigurationPlan {
    fileName: string;
    buildDefaults: (references: ConfigurationReferences) => TypeScriptConfiguration;
    includePatterns: string[];
    generatesPaths: boolean;
}

const buildConfigurationPlans = (globalSettings: GlobalSettings, layout: SourceLayout): ConfigurationPlan[] => {
    const allSourceRoots = Object.values(globalSettings.paths.sources);
    const ownedSourceRoots = allSourceRoots.filter((sourceRoot) => !sourceRoot.startsWith(VENDOR_SOURCE_PREFIX));

    return [
        {
            fileName: BUILD_CONFIGURATION_FILE_NAME,
            buildDefaults: buildDefaultBuildConfiguration,
            includePatterns: [...buildIncludePatterns(allSourceRoots), buildAmbientTypesInclude(layout)],
            generatesPaths: true,
        },
        {
            fileName: LINT_CONFIGURATION_FILE_NAME,
            buildDefaults: buildDefaultLintConfiguration,
            includePatterns: [...buildIncludePatterns(ownedSourceRoots), buildAmbientTypesInclude(layout)],
            generatesPaths: false,
        },
    ];
};

// Covers every layout, so switching layouts replaces the previous layout's entries instead of leaving them.
const buildRecognisedIncludeEntries = (globalSettings: GlobalSettings): string[] => {
    const ladders = ['', ...sourceLayouts.map((layout) => buildParentDirectoryLadder(buildBuilderDirectory(layout)))];

    const entries = sourceLayouts.flatMap((layout) => {
        const sourceRoots = Object.values(layout.sources);

        return [...buildIncludePatterns(sourceRoots), buildAmbientTypesInclude(layout)];
    });

    return [...new Set(ladders.flatMap((ladder) => entries.map((entry) => joinConfigurationPath(ladder, entry))))];
};

/** Rewritten on every run: the builder owns it, and a project overrides it from its root tsconfig.json. */
export const reconcileDefaultsConfiguration = (
    globalSettings: GlobalSettings,
): { filePath: string; configuration: TypeScriptConfiguration } => {
    const directory = buildBuilderDirectory(detectSourceLayout(globalSettings.context));
    const parentDirectoryLadder = buildParentDirectoryLadder(directory);
    const configurationPath = joinConfigurationPath(directory, DEFAULTS_CONFIGURATION_FILE_NAME);

    return {
        filePath: join(globalSettings.context, configurationPath),
        configuration: {
            compilerOptions: {
                ...SHARED_COMPILER_OPTIONS,
                // Path-bearing options resolve against this file, so they climb back to the project root.
                typeRoots: [joinConfigurationPath(parentDirectoryLadder, 'node_modules/@types')],
                rootDir: parentDirectoryLadder,
                ...BACK_OFFICE_COMPILER_OPTIONS,
            },
            // An exclude glob resolves against this file as well, the `**/` ones included.
            exclude: SHARED_EXCLUDED_PATHS.map((excludedPath) =>
                joinConfigurationPath(parentDirectoryLadder, excludedPath),
            ),
        },
    };
};

export const reconcileProjectSolution = (globalSettings: GlobalSettings): SolutionReconciliation => {
    const equivalentReferencePaths = [
        BUILD_CONFIGURATION_FILE_NAME,
        ...sourceLayouts.map((layout) =>
            joinConfigurationPath(buildBuilderDirectory(layout), BUILD_CONFIGURATION_FILE_NAME),
        ),
    ];

    return reconcileSolutionConfiguration(globalSettings.context, {
        referencePath: `./${resolveBuildConfigurationLocation(globalSettings.context).configurationPath}`,
        isEquivalentReference: (referencePath) => equivalentReferencePaths.includes(referencePath),
    });
};

export const reconcileTypeScriptConfigurations = async (
    globalSettings: GlobalSettings,
): Promise<ReconciledTypeScriptConfiguration[]> => {
    const layout = detectSourceLayout(globalSettings.context);
    const builderDirectory = buildBuilderDirectory(layout);
    const generatedAliases: ModulePathAliases = sortPathAliases({
        ...buildLegacyPathAliases(globalSettings),
        ...(await buildGeneratedModulePathAliases(globalSettings)),
    });
    const recognisedIncludeEntries = buildRecognisedIncludeEntries(globalSettings);

    const buildConfigurationDirectory =
        resolveConfigurationLocation(globalSettings.context, BUILD_CONFIGURATION_FILE_NAME) === 'projectRoot'
            ? ''
            : builderDirectory;

    return buildConfigurationPlans(globalSettings, layout).map(
        ({ fileName, buildDefaults, includePatterns, generatesPaths }) => {
            const location = resolveConfigurationLocation(globalSettings.context, fileName);
            const directory = location === 'projectRoot' ? '' : builderDirectory;
            const parentDirectoryLadder = buildParentDirectoryLadder(directory);
            const references: ConfigurationReferences = {
                parentDirectoryLadder,
                buildConfiguration:
                    directory === buildConfigurationDirectory
                        ? `./${BUILD_CONFIGURATION_FILE_NAME}`
                        : buildRelativeReference(
                              parentDirectoryLadder,
                              joinConfigurationPath(buildConfigurationDirectory, BUILD_CONFIGURATION_FILE_NAME),
                          ),
            };
            const configurationPath = joinConfigurationPath(directory, fileName);
            const filePath = join(globalSettings.context, configurationPath);

            const existingConfiguration = readConfigurationFile(filePath);
            const wasCreated = existingConfiguration === null;
            const configuration: TypeScriptConfiguration = existingConfiguration ?? buildDefaults(references);

            // Generated like `paths`; a copy the project keeps in its root keeps whatever it extends.
            if (generatesPaths && location === 'builder') {
                configuration.extends = buildGeneratedExtends(parentDirectoryLadder);
            }

            if (generatesPaths) {
                const compilerOptions = configuration.compilerOptions ?? {};
                const relativeAliases = Object.fromEntries(
                    Object.entries(generatedAliases).map(([aliasName, aliasValues]) => [
                        aliasName,
                        toRelativeAliasValues(aliasValues, parentDirectoryLadder),
                    ]),
                );

                compilerOptions.paths = sortPathAliases(
                    mergeModulePathAliases(compilerOptions.paths ?? {}, relativeAliases),
                );
                configuration.compilerOptions = compilerOptions;
            }

            configuration.include = reconcileEntryList(
                configuration.include,
                includePatterns.map((includePattern) => joinConfigurationPath(parentDirectoryLadder, includePattern)),
                (existingEntry) => recognisedIncludeEntries.includes(existingEntry),
            );

            return { fileName, filePath, configurationPath, configuration, wasCreated };
        },
    );
};
