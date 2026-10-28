import { sourceLayouts, type SourceLayout } from '../../settings.mts';
import type { PathAliasMap } from '../aliases/alias-provider.mts';
import { SHARED_THEME_OPTIONS } from '../aliases/path-alias-providers.mts';
import { isApplicationLayerRoot, toSiblingSharedDirectory } from '../aliases/shared-theme-aliases.mts';
import { toConfigurationPathSegments } from './configuration-path.mts';

export const sortPathAliases = (aliases: PathAliasMap): PathAliasMap =>
    Object.fromEntries(Object.entries(aliases).sort(([left], [right]) => left.localeCompare(right)));

const startsWithKnownSourceRoot = (aliasValue: string): boolean => {
    const segments = toConfigurationPathSegments(aliasValue);
    const firstNamedSegmentIndex = segments.findIndex((segment) => segment !== '..');

    if (firstNamedSegmentIndex === -1) {
        return false;
    }

    const valueSegments = segments.slice(firstNamedSegmentIndex);

    // The Shared theme of a Zed layer root sits in the sibling directory, so that one counts as well.
    return sourceLayouts.some((layout: SourceLayout) =>
        Object.values(layout.sources)
            .flatMap((sourceRoot) =>
                isApplicationLayerRoot(sourceRoot, SHARED_THEME_OPTIONS)
                    ? [sourceRoot, toSiblingSharedDirectory(sourceRoot)]
                    : [sourceRoot],
            )
            .some((sourceRoot) =>
                toConfigurationPathSegments(sourceRoot).every(
                    (segment, index) => segment.includes('*') || valueSegments[index] === segment,
                ),
            ),
    );
};

/**
 * Generated aliases override hand edits; a stale alias that still looks generated — a name some provider
 * owns, every target inside a known source root — is dropped, any other is kept.
 */
export const mergePathAliases = (
    existingAliases: PathAliasMap,
    generatedAliases: PathAliasMap,
    isGeneratedAliasName: (aliasName: string) => boolean,
): PathAliasMap => {
    const handWrittenAliases = Object.fromEntries(
        Object.entries(existingAliases).filter(
            ([aliasName, aliasValues]) =>
                !(aliasName in generatedAliases) &&
                !(
                    isGeneratedAliasName(aliasName) &&
                    Array.isArray(aliasValues) &&
                    aliasValues.length > 0 &&
                    aliasValues.every((aliasValue) => startsWithKnownSourceRoot(String(aliasValue)))
                ),
        ),
    );

    return { ...generatedAliases, ...handWrittenAliases };
};
