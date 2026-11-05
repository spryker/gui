import type { CommandProps, NodeConfig, NodeViewRendererProps } from '@tiptap/core';
import type { ImageOptions } from '@tiptap/extension-image';
import { NodeSelection } from '@tiptap/pm/state';
import { createImageView } from './image-view';

const IMAGE_FLOATS = ['left', 'right'] as const;
export type ImageFloat = (typeof IMAGE_FLOATS)[number];

// Summernote's image popover sizes (summernote-bs5.js `resize`), stored as `style="width: N%"`.
export const IMAGE_WIDTH_PRESETS = ['100%', '50%', '25%'] as const;

// Only lengths Summernote wrote are kept; any other value (calc(), vw, expression()) is dropped.
const CSS_LENGTH = /^\d+(?:\.\d+)?(?:px|%)$/;
const FLOAT_CLASS_PREFIX = 'note-float-';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        imageLayout: {
            /** The selected image's width (`N%` or `Npx`), or null for its own size; clears any stored height. */
            setImageWidth: (width: string | null) => ReturnType;
            /** Floats the selected image, or removes the float with null. */
            setImageFloat: (float: ImageFloat | null) => ReturnType;
        };
    }
}

const readLength = (value: string): string | null => {
    const length = value.trim();

    return CSS_LENGTH.test(length) ? length : null;
};

// Checked again on output: a feature may set the attribute through updateAttributes() with any value.
const renderLength = (property: string, value: unknown): Record<string, string> => {
    const length = typeof value === 'string' ? readLength(value) : null;

    return length === null ? {} : { style: `${property}: ${length}` };
};

const isImageFloat = (value: unknown): value is ImageFloat => IMAGE_FLOATS.includes(value as ImageFloat);

const readFloat = (element: HTMLElement): ImageFloat | null => {
    const float = element.style.cssFloat;

    if (isImageFloat(float)) {
        return float;
    }

    return IMAGE_FLOATS.find((side) => element.classList.contains(`${FLOAT_CLASS_PREFIX}${side}`)) ?? null;
};

// updateAttributes() replaces the image (a leaf), which ends its node selection and would close the image menu
// after every size or float button; the image is selected again.
const updateSelectedImage = (
    { state, tr, commands }: CommandProps,
    imageType: string,
    attributes: Record<string, unknown>,
): boolean => {
    const { selection } = state;

    if (!(selection instanceof NodeSelection) || selection.node.type.name !== imageType) {
        return false;
    }

    if (!commands.updateAttributes(imageType, attributes)) {
        return false;
    }

    tr.setSelection(NodeSelection.create(tr.doc, selection.from));

    return true;
};

/**
 * Size and float of an image, stored the way Summernote's image popover wrote them: `style="width: 50%;"`,
 * `style="width: 320px; height: 200px;"` after a drag, `style="float: left;"` plus the class `note-float-left`.
 * Content laid out in Summernote therefore keeps its layout once edited, and storefront CSS keyed on it keeps
 * working. A selected image has drag handles (image-view.ts); a drag stores the width in pixels.
 */
export const imageLayout: Partial<NodeConfig<ImageOptions>> = {
    addAttributes() {
        return {
            ...this.parent?.(),
            styleWidth: {
                default: null,
                parseHTML: (element: HTMLElement) => readLength(element.style.width),
                renderHTML: (attributes: Record<string, unknown>) => renderLength('width', attributes.styleWidth),
            },
            styleHeight: {
                default: null,
                parseHTML: (element: HTMLElement) => readLength(element.style.height),
                renderHTML: (attributes: Record<string, unknown>) => renderLength('height', attributes.styleHeight),
            },
            float: {
                default: null,
                parseHTML: readFloat,
                renderHTML: (attributes: Record<string, unknown>) =>
                    isImageFloat(attributes.float)
                        ? { style: `float: ${attributes.float}`, class: `${FLOAT_CLASS_PREFIX}${attributes.float}` }
                        : {},
            },
        };
    },

    addCommands() {
        return {
            ...this.parent?.(),
            setImageWidth:
                (width: string | null) =>
                (props: CommandProps): boolean => {
                    const styleWidth = width === null ? null : readLength(width);

                    return (
                        (width === null || styleWidth !== null) &&
                        updateSelectedImage(props, this.name, {
                            styleWidth,
                            styleHeight: null,
                            width: null,
                            height: null,
                        })
                    );
                },
            setImageFloat:
                (float: ImageFloat | null) =>
                (props: CommandProps): boolean =>
                    (float === null || isImageFloat(float)) && updateSelectedImage(props, this.name, { float }),
        };
    },

    addNodeView() {
        return (props: NodeViewRendererProps) => createImageView(props, this.options.HTMLAttributes);
    },
};
