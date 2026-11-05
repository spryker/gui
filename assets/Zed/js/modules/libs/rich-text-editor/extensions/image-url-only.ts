import type { CommandProps } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import type { SetImageOptions } from '@tiptap/extension-image';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { imageLayout } from './image-layout';

// Tiptap Image's node name, which this extension keeps.
export const IMAGE_NODE_NAME = 'image';

const ABSOLUTE_WEB_URL = /^(https?:)?\/\//i;
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const DATA_IMAGE_SELECTOR = 'img[src^="data:" i]';

/** Web (https://, http://, //) and relative image addresses; every other scheme, data: included, is refused. */
export const isAllowedImageSource = (src: string): boolean => {
    const source = src.trim();

    if (source === '') {
        return false;
    }

    return ABSOLUTE_WEB_URL.test(source) || !ANY_SCHEME.test(source);
};

const stripDataImages = (html: string, onRejected: () => void): string => {
    const template = document.createElement('template');
    template.innerHTML = html;
    const dataImages = template.content.querySelectorAll(DATA_IMAGE_SELECTOR);

    if (dataImages.length === 0) {
        return html;
    }

    dataImages.forEach((image) => image.remove());
    onRejected();

    return template.innerHTML;
};

// "Copy image" in a browser puts the file next to an <img src="https://…"> in text/html; that HTML is kept (and
// cleaned by transformPastedHTML), so only a transfer carrying nothing but files is refused.
const isFileOnlyTransfer = (dataTransfer: DataTransfer | null): boolean =>
    (dataTransfer?.files.length ?? 0) > 0 && (dataTransfer?.getData('text/html') ?? '') === '';

/**
 * Images by address only. Stored content keeps loading its existing data: images (`allowBase64`), but new ones
 * cannot be added: the setImage command, pasted HTML and pasted or dropped files are refused.
 */
export const createImageUrlOnly = (onRejected: () => void) =>
    Image.extend({
        addCommands() {
            return {
                setImage:
                    (options: SetImageOptions) =>
                    ({ commands }: CommandProps): boolean =>
                        isAllowedImageSource(options.src) &&
                        commands.insertContent({ type: this.name, attrs: options }),
            };
        },

        addProseMirrorPlugins() {
            return [
                new Plugin({
                    key: new PluginKey('imageUrlOnly'),
                    props: {
                        transformPastedHTML: (html: string) => stripDataImages(html, onRejected),
                        handlePaste: (view, event) => {
                            if (!isFileOnlyTransfer(event.clipboardData)) {
                                return false;
                            }

                            onRejected();

                            return true;
                        },
                        handleDrop: (view, event) => {
                            if (!isFileOnlyTransfer(event.dataTransfer)) {
                                return false;
                            }

                            onRejected();

                            return true;
                        },
                    },
                }),
            ];
        },
    })
        .extend(imageLayout)
        .configure({ inline: true, allowBase64: true });
