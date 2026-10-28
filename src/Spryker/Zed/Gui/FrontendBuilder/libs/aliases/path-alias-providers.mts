import type { GlobalSettings } from '../../settings.mts';
import type { AliasProvider } from './alias-provider.mts';
import { createModuleAliasProvider } from './module-aliases.mts';
import { createSharedThemeAliasProvider, type SharedThemeAliasOptions } from './shared-theme-aliases.mts';

// A generated build configuration hands over namespace roots such as `src/Pyz`, which hold the flat
// `Shared/<Module>` shape beside the per-module one.
export const SHARED_THEME_OPTIONS: SharedThemeAliasOptions = {
    applicationLayerDirectoryName: 'Zed',
    searchesFlatSharedLayerOfNamespaceRoots: true,
};

// The one place that decides which aliases the Back Office build generates; a new kind is one more entry.
export const createPathAliasProviders = (globalSettings: GlobalSettings): AliasProvider[] => [
    createModuleAliasProvider(globalSettings),
    createSharedThemeAliasProvider(SHARED_THEME_OPTIONS),
];
