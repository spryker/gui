import glob from 'fast-glob';
import { sourceLayouts, type GlobalSettings, type SourceLayout } from '../../settings.mts';
import { dasherize, joinConfigurationPath, toConfigurationPathSegments } from './configuration-path.mts';

export type ModulePathAliases = Record<string, string[]>;

export const MODULE_PATH_ALIAS_PREFIX = '@zed/';

const ASSET_ROOT_SUFFIX = 'assets/Zed';

// Kept verbatim for backward compatibility: existing Back Office JavaScript imports through them.
const LEGACY_ALIAS_MODULE_RELATIVE_PATHS: Record<string, string> = {
    ZedGui: 'assets/Zed/js/modules/commons',
    ZedGuiEditorConfiguration: 'assets/Zed/js/modules/editor',
    ZedGuiModules: 'assets/Zed/js/modules',
};

export const sortPathAliases = (aliases: ModulePathAliases): ModulePathAliases =>
    Object.fromEntries(Object.entries(aliases).sort(([left], [right]) => left.localeCompare(right)));

const findAssetRootDirectories = async (context: string, sourceRoot: string): Promise<string[]> => {
    const directories = await glob(joinConfigurationPath(sourceRoot, '**', ASSET_ROOT_SUFFIX), {
        cwd: context,
        onlyDirectories: true,
        onlyFiles: false,
        unique: true,
        followSymbolicLinks: false,
        ignore: ['**/node_modules/**', '**/Zed/Gui/FrontendBuilder/**'],
    });

    return directories.sort();
};

// The first segment below the source root, which also holds for the nested `src/SprykerFeature/<Module>/src/…` shape.
const getModuleDirectoryName = (sourceRoot: string, assetRootDirectory: string): string | null => {
    const sourceRootSegmentCount = toConfigurationPathSegments(sourceRoot).filter(
        (segment) => !segment.includes('*'),
    ).length;
    const segments = toConfigurationPathSegments(assetRootDirectory);

    return segments[sourceRootSegmentCount] ?? null;
};

export const buildGeneratedModulePathAliases = async (globalSettings: GlobalSettings): Promise<ModulePathAliases> => {
    const aliases: ModulePathAliases = {};

    // Later source roots replace earlier ones, so a same-named project module overrides a core one.
    for (const sourceRoot of Object.values(globalSettings.paths.sources)) {
        const assetRootDirectories = await findAssetRootDirectories(globalSettings.context, sourceRoot);
        const shallowestByModule = new Map<string, string>();

        for (const assetRootDirectory of assetRootDirectories) {
            const moduleDirectoryName = getModuleDirectoryName(sourceRoot, assetRootDirectory);

            if (moduleDirectoryName === null) {
                continue;
            }

            const alreadyChosen = shallowestByModule.get(moduleDirectoryName);

            // A module may ship several asset roots (AiCommerce does); the shallowest is canonical.
            if (
                alreadyChosen === undefined ||
                toConfigurationPathSegments(assetRootDirectory).length <
                    toConfigurationPathSegments(alreadyChosen).length
            ) {
                shallowestByModule.set(moduleDirectoryName, assetRootDirectory);
            }
        }

        for (const [moduleDirectoryName, assetRootDirectory] of shallowestByModule) {
            aliases[`${MODULE_PATH_ALIAS_PREFIX}${dasherize(moduleDirectoryName)}/*`] = [
                `./${joinConfigurationPath(assetRootDirectory, '*')}`,
            ];
        }
    }

    return sortPathAliases(aliases);
};

export const buildLegacyPathAliases = (globalSettings: GlobalSettings): ModulePathAliases => {
    const guiModuleDirectory = joinConfigurationPath(globalSettings.paths.sources.core, globalSettings.guiFolder);
    const aliases: ModulePathAliases = {};

    for (const [aliasName, moduleRelativePath] of Object.entries(LEGACY_ALIAS_MODULE_RELATIVE_PATHS)) {
        const target = `./${joinConfigurationPath(guiModuleDirectory, moduleRelativePath)}`;

        // webpack treats a bare alias as a prefix, so `ZedGuiModules/legacy/SprykerAjax` needs the `/*` form too.
        aliases[aliasName] = [target];
        aliases[`${aliasName}/*`] = [`${target}/*`];
    }

    return sortPathAliases(aliases);
};

const isGeneratedAliasName = (aliasName: string): boolean =>
    aliasName.startsWith(MODULE_PATH_ALIAS_PREFIX) ||
    Object.keys(LEGACY_ALIAS_MODULE_RELATIVE_PATHS).some(
        (legacyName) => aliasName === legacyName || aliasName === `${legacyName}/*`,
    );

const startsWithKnownSourceRoot = (aliasValue: string): boolean => {
    const segments = toConfigurationPathSegments(aliasValue);
    const firstNamedSegmentIndex = segments.findIndex((segment) => segment !== '..');

    if (firstNamedSegmentIndex === -1) {
        return false;
    }

    const valueSegments = segments.slice(firstNamedSegmentIndex);

    return sourceLayouts.some((layout: SourceLayout) =>
        Object.values(layout.sources).some((sourceRoot) => {
            const sourceRootSegments = toConfigurationPathSegments(sourceRoot);

            return sourceRootSegments.every(
                (segment, index) => segment.includes('*') || valueSegments[index] === segment,
            );
        }),
    );
};

/** Generated aliases override hand edits; a stale alias that still looks generated is dropped, any other is kept. */
export const mergeModulePathAliases = (
    existingAliases: ModulePathAliases,
    generatedAliases: ModulePathAliases,
): ModulePathAliases => {
    const handWrittenAliases = Object.fromEntries(
        Object.entries(existingAliases).filter(
            ([aliasName, aliasValues]) =>
                !(aliasName in generatedAliases) &&
                !(
                    isGeneratedAliasName(aliasName) &&
                    Array.isArray(aliasValues) &&
                    aliasValues.length === 1 &&
                    startsWithKnownSourceRoot(String(aliasValues[0]))
                ),
        ),
    );

    return { ...generatedAliases, ...handWrittenAliases };
};

export const toRelativeAliasValues = (aliasValues: string[], parentDirectoryLadder: string): string[] =>
    aliasValues.map((aliasValue) =>
        parentDirectoryLadder === ''
            ? `./${joinConfigurationPath(aliasValue)}`
            : joinConfigurationPath(parentDirectoryLadder, aliasValue),
    );
