import { Node } from '@tiptap/core';
import type { CommandProps } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { VideoProvider } from '../types';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        videoEmbed: {
            /** Embeds the video of a page URL; false when no provider recognises the address. */
            setVideoEmbed: (pageUrl: string) => ReturnType;
        };
    }
}

const NODE_NAME = 'videoEmbed';
// Above the paragraph rule (default 50), so a video-only paragraph is read as the video.
const PARAGRAPH_WRAPPER_PRIORITY = 60;

const parseDimension = (value: string | null): number | null => {
    const dimension = Number.parseInt(value ?? '', 10);

    return Number.isFinite(dimension) && dimension > 0 ? dimension : null;
};

/**
 * A provider-hosted video as a bare <iframe>, the markup Summernote stored. Only iframes whose address a
 * provider recognises are parsed; any other iframe (Vine, unknown hosts) is left to the content guard.
 */
export const createVideoEmbed = (providers: readonly VideoProvider[]) => {
    const findEmbedProvider = (src: string): VideoProvider | undefined =>
        providers.find((provider) => provider.matchesEmbedSrc(src));

    const toEmbedAttributes = (pageUrl: string) => {
        for (const provider of providers) {
            const embed = provider.toEmbed(pageUrl);

            if (embed !== null) {
                return embed;
            }
        }

        return null;
    };

    return Node.create({
        name: NODE_NAME,
        group: 'block',
        atom: true,
        selectable: true,
        draggable: false,

        addAttributes() {
            return {
                src: { default: null },
                width: {
                    default: null,
                    parseHTML: (element: HTMLElement) => parseDimension(element.getAttribute('width')),
                },
                height: {
                    default: null,
                    parseHTML: (element: HTMLElement) => parseDimension(element.getAttribute('height')),
                },
            };
        },

        parseHTML() {
            return [
                {
                    tag: 'iframe[src]',
                    getAttrs: (element: HTMLElement) =>
                        findEmbedProvider(element.getAttribute('src') ?? '') === undefined ? false : null,
                },
                // Summernote inserted videos into a paragraph (<p><iframe></iframe></p>). Such a paragraph is read
                // as the video itself; otherwise the block would split it and leave an empty <p> on every save.
                {
                    tag: 'p',
                    priority: PARAGRAPH_WRAPPER_PRIORITY,
                    getAttrs: (element: HTMLElement) => {
                        const iframe = element.firstElementChild;
                        const src = iframe?.getAttribute('src') ?? '';

                        if (
                            element.childElementCount !== 1 ||
                            iframe?.tagName !== 'IFRAME' ||
                            element.textContent?.trim()
                        ) {
                            return false;
                        }

                        return findEmbedProvider(src) === undefined
                            ? false
                            : {
                                  src,
                                  width: parseDimension(iframe.getAttribute('width')),
                                  height: parseDimension(iframe.getAttribute('height')),
                              };
                    },
                },
            ];
        },

        renderHTML({ node }) {
            const src = String(node.attrs.src ?? '');

            return [
                'iframe',
                {
                    src,
                    ...(node.attrs.width === null ? {} : { width: String(node.attrs.width) }),
                    ...(node.attrs.height === null ? {} : { height: String(node.attrs.height) }),
                    frameborder: '0',
                    ...(findEmbedProvider(src)?.attributes ?? {}),
                },
            ];
        },

        addCommands() {
            return {
                setVideoEmbed:
                    (pageUrl: string) =>
                    ({ commands }: CommandProps): boolean => {
                        const embed = toEmbedAttributes(pageUrl);

                        return embed !== null && commands.insertContent({ type: NODE_NAME, attrs: embed });
                    },
            };
        },

        addProseMirrorPlugins() {
            const editor = this.editor;

            return [
                new Plugin({
                    key: new PluginKey('videoEmbedPaste'),
                    props: {
                        // A pasted bare video address becomes an embed, as the video dialog would make it.
                        handlePaste: (view, event) => {
                            const text = event.clipboardData?.getData('text/plain').trim() ?? '';

                            if (text === '' || /\s/.test(text) || toEmbedAttributes(text) === null) {
                                return false;
                            }

                            return editor.commands.setVideoEmbed(text);
                        },
                    },
                }),
            ];
        },
    });
};
