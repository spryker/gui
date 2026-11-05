import type { VideoProvider } from '../types';

export interface ProviderDefinition {
    readonly name: string;
    readonly width: number;
    readonly height: number;
    readonly attributes?: Readonly<Record<string, string>>;
    /** Tried in order; the first match is passed to `toSrc`. */
    readonly pageUrlPatterns: readonly RegExp[];
    /** Builds the embed address from a page-URL match; null when the match is not usable. */
    toSrc(match: RegExpMatchArray): string | null;
    /** Recognises an existing embed (an iframe `src`), protocol-relative Summernote output included. */
    readonly embedSrcPattern: RegExp;
}

export const defineVideoProvider = (definition: ProviderDefinition): VideoProvider => ({
    name: definition.name,
    attributes: definition.attributes,
    toEmbed(pageUrl: string) {
        const url = pageUrl.trim();

        for (const pattern of definition.pageUrlPatterns) {
            const match = url.match(pattern);
            const src = match === null ? null : definition.toSrc(match);

            if (src !== null) {
                return { src, width: definition.width, height: definition.height };
            }
        }

        return null;
    },
    matchesEmbedSrc: (src: string) => definition.embedSrcPattern.test(src.trim()),
});
