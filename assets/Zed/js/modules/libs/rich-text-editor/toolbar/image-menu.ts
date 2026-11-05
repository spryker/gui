import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { openImageDialog } from '../dialogs/image-dialog';
import { IMAGE_WIDTH_PRESETS } from '../extensions/image-layout';
import type { ImageFloat } from '../extensions/image-layout';
import { IMAGE_NODE_NAME } from '../extensions/image-url-only';
import type { LabelKey, Labels } from '../labels';
import type { NodeMenuDefinition, ToolbarItemDefinition } from '../types';
import type { IconShape } from './icons';
import {
    ICON_EDIT,
    ICON_FLOAT_LEFT,
    ICON_FLOAT_NONE,
    ICON_FLOAT_RIGHT,
    ICON_ORIGINAL_SIZE,
    ICON_TRASH,
} from './menu-icons';

const WIDTH_LABELS: Readonly<Record<(typeof IMAGE_WIDTH_PRESETS)[number], LabelKey>> = {
    '100%': 'imageWidthFull',
    '50%': 'imageWidthHalf',
    '25%': 'imageWidthQuarter',
};

export const isNodeSelected = (editor: Editor, nodeName?: string): boolean => {
    const { selection } = editor.state;

    return selection instanceof NodeSelection && (nodeName === undefined || selection.node.type.name === nodeName);
};

// Without an icon the button shows its label: the sizes read as "100%", "50%", "25%", as in Summernote.
const widthToggle = (labels: Labels, width: (typeof IMAGE_WIDTH_PRESETS)[number]): ToolbarItemDefinition => ({
    id: `image-width-${Number.parseInt(width, 10)}`,
    label: labels.get(WIDTH_LABELS[width]),
    kind: 'toggle',
    run: (editor) => editor.chain().focus().setImageWidth(width).run(),
    isActive: (editor) => editor.getAttributes(IMAGE_NODE_NAME).styleWidth === width,
    isEnabled: (editor) => editor.can().setImageWidth(width),
});

const floatToggle = (
    labels: Labels,
    float: ImageFloat,
    labelKey: LabelKey,
    iconShape: IconShape,
): ToolbarItemDefinition => ({
    id: `image-float-${float}`,
    label: labels.get(labelKey),
    iconShape,
    kind: 'toggle',
    run: (editor) => editor.chain().focus().setImageFloat(float).run(),
    isActive: (editor) => editor.getAttributes(IMAGE_NODE_NAME).float === float,
    isEnabled: (editor) => editor.can().setImageFloat(float),
});

/** Summernote's image popover: edit, sizes, original size, float left/right/none, remove. */
export const createImageMenu = (labels: Labels): NodeMenuDefinition => ({
    nodeName: IMAGE_NODE_NAME,
    label: labels.get('image'),
    showLabels: false,
    // isActive('image') is also true for a cursor right before an inline image.
    isShown: (editor) => isNodeSelected(editor, IMAGE_NODE_NAME),
    items: [
        {
            id: 'image-edit',
            label: labels.get('imageEdit'),
            iconShape: ICON_EDIT,
            kind: 'button',
            run: (editor) => openImageDialog(editor, labels),
        },
        ...IMAGE_WIDTH_PRESETS.map((width) => widthToggle(labels, width)),
        {
            id: 'image-original-size',
            label: labels.get('imageOriginalSize'),
            iconShape: ICON_ORIGINAL_SIZE,
            kind: 'button',
            run: (editor) => editor.chain().focus().setImageWidth(null).run(),
            isEnabled: (editor) => editor.can().setImageWidth(null),
        },
        floatToggle(labels, 'left', 'imageFloatLeft', ICON_FLOAT_LEFT),
        floatToggle(labels, 'right', 'imageFloatRight', ICON_FLOAT_RIGHT),
        {
            id: 'image-float-none',
            label: labels.get('imageFloatNone'),
            iconShape: ICON_FLOAT_NONE,
            kind: 'button',
            run: (editor) => editor.chain().focus().setImageFloat(null).run(),
            isEnabled: (editor) => editor.can().setImageFloat(null),
        },
        {
            id: 'image-remove',
            label: labels.get('imageRemove'),
            iconShape: ICON_TRASH,
            kind: 'button',
            run: (editor) => editor.chain().focus().deleteSelection().run(),
        },
    ],
});
