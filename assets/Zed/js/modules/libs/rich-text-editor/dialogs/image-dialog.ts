import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { IMAGE_NODE_NAME, isAllowedImageSource } from '../extensions/image-url-only';
import type { Labels } from '../labels';
import { openDialog } from './modal';

export interface ImageValues {
    readonly src: string;
    readonly alt: string;
}

const isImageSelected = (editor: Editor): boolean => {
    const { selection } = editor.state;

    return selection instanceof NodeSelection && selection.node.type.name === IMAGE_NODE_NAME;
};

/**
 * Inserts an image by address, or changes the selected image; returns false for anything but a web or relative
 * address. The check here is the only one for a change: updateAttributes bypasses the URL-only setImage command.
 * A selected image keeping its stored address passes, so a legacy embedded (data:) image can get its alt text.
 */
export const applyImage = (editor: Editor, values: ImageValues): boolean => {
    const src = values.src.trim();
    const isEditing = isImageSelected(editor);
    const isStoredSource = isEditing && src === editor.getAttributes(IMAGE_NODE_NAME).src;

    if (!isStoredSource && !isAllowedImageSource(src)) {
        return false;
    }

    const alt = values.alt.trim();

    if (isEditing) {
        // updateAttributes() replaces the image, which ends its selection and would close the image menu.
        return editor
            .chain()
            .focus()
            .updateAttributes(IMAGE_NODE_NAME, { src, alt: alt === '' ? null : alt })
            .setNodeSelection(editor.state.selection.from)
            .run();
    }

    return editor
        .chain()
        .focus()
        .setImage({ src, ...(alt === '' ? {} : { alt }) })
        .run();
};

export const openImageDialog = (editor: Editor, labels: Labels): void => {
    const isEditing = isImageSelected(editor);
    const current = (isEditing ? editor.getAttributes(IMAGE_NODE_NAME) : {}) as { src?: string; alt?: string | null };

    openDialog({
        title: labels.get(isEditing ? 'imageEditDialogTitle' : 'imageDialogTitle'),
        fields: [
            { name: 'src', label: labels.get('imageUrl'), type: 'url', value: current.src ?? '' },
            { name: 'alt', label: labels.get('imageAlt'), type: 'text', value: current.alt ?? '' },
        ],
        submitLabel: labels.get(isEditing ? 'dialogSave' : 'dialogInsert'),
        cancelLabel: labels.get('dialogCancel'),
        closeLabel: labels.get('dialogClose'),
        onSubmit: (values) =>
            applyImage(editor, { src: String(values.src ?? ''), alt: String(values.alt ?? '') })
                ? null
                : labels.get('imageInvalid'),
        onClose: () => editor.commands.focus(),
    });
};
