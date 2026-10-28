import glob from 'fast-glob';
import type { GlobalSettings } from '../../settings.mts';
import { dasherize, joinConfigurationPath, toConfigurationPathSegments } from '../typescript/configuration-path.mts';
import type { AliasProvider, PathAliasMap, SourceRoots } from './alias-provider.mts';

const MODULE_PATH_ALIAS_PREFIX = '@zed/';

const ASSET_ROOT_SUFFIX = 'assets/Zed';

// Kept verbatim for backward compatibility: existing Back Office JavaScript imports through them.
const LEGACY_ALIAS_MODULE_RELATIVE_PATHS: Record<string, string> = {
    ZedGui: 'assets/Zed/js/modules/commons',
    ZedGuiEditorConfiguration: 'assets/Zed/js/modules/editor',
    ZedGuiModules: 'assets/Zed/js/modules',
};

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

// The directory that contains `assets/Zed` is the module, whatever lies above it: `src/Spryker/Tax`,
// `src/Pyz/PriceFormatting/src/Pyz/Zed/PriceFormatting`, `src/Pyz/Zed/Tax` and `vendor/spryker/tax` all
// name their module in that position.
const getModuleDirectoryName = (assetRootDirectory: string): string | null => {
    const segments = toConfigurationPathSegments(assetRootDirectory);

    return segments[segments.length - toConfigurationPathSegments(ASSET_ROOT_SUFFIX).length - 1] ?? null;
};

const buildModulePathAliases = async (context: string, scanOrderedSourceRoots: string[]): Promise<PathAliasMap> => {
    const aliases: PathAliasMap = {};

    // Later source roots replace earlier ones, so a same-named project module overrides a core one.
    for (const sourceRoot of scanOrderedSourceRoots) {
        const assetRootDirectories = await findAssetRootDirectories(context, sourceRoot);
        const shallowestByModule = new Map<string, string>();

        for (const assetRootDirectory of assetRootDirectories) {
            const moduleDirectoryName = getModuleDirectoryName(assetRootDirectory);

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

    return aliases;
};

const buildLegacyPathAliases = (guiModuleDirectory: string): PathAliasMap => {
    const aliases: PathAliasMap = {};

    for (const [aliasName, moduleRelativePath] of Object.entries(LEGACY_ALIAS_MODULE_RELATIVE_PATHS)) {
        const target = `./${joinConfigurationPath(guiModuleDirectory, moduleRelativePath)}`;

        // webpack treats a bare alias as a prefix, so `ZedGuiModules/legacy/SprykerAjax` needs the `/*` form too.
        aliases[aliasName] = [target];
        aliases[`${aliasName}/*`] = [`${target}/*`];
    }

    return aliases;
};

/**
 * `@zed/<module>/*` for every module with Back Office assets, plus the legacy Gui aliases. Unlike the
 * core/project split, the module aliases follow the settings' own source order, as the finder does: a
 * root a settings file appends wins over the project one, whichever namespace it belongs to.
 */
export const createModuleAliasProvider = (globalSettings: GlobalSettings): AliasProvider => ({
    name: 'module',

    async collect({ context }: SourceRoots): Promise<PathAliasMap> {
        return {
            ...buildLegacyPathAliases(
                joinConfigurationPath(globalSettings.paths.sources.core, globalSettings.guiFolder),
            ),
            ...(await buildModulePathAliases(context, Object.values(globalSettings.paths.sources))),
        };
    },

    ownsAliasName: (aliasName: string): boolean =>
        aliasName.startsWith(MODULE_PATH_ALIAS_PREFIX) ||
        Object.keys(LEGACY_ALIAS_MODULE_RELATIVE_PATHS).some(
            (legacyName) => aliasName === legacyName || aliasName === `${legacyName}/*`,
        ),
});
