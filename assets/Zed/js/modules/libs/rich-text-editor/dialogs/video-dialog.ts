import type { Editor } from '@tiptap/core';
import type { Labels } from '../labels';
import { openDialog } from './modal';

/** Embeds the video of a page URL; returns false when no provider recognises the address. */
const applyVideo = (editor: Editor, pageUrl: string): boolean =>
    pageUrl.trim() !== '' && editor.chain().focus().setVideoEmbed(pageUrl.trim()).run();

export const openVideoDialog = (editor: Editor, labels: Labels): void => {
    openDialog({
        title: labels.get('videoDialogTitle'),
        fields: [{ name: 'url', label: labels.get('videoUrl'), type: 'url' }],
        submitLabel: labels.get('dialogInsert'),
        cancelLabel: labels.get('dialogCancel'),
        closeLabel: labels.get('dialogClose'),
        onSubmit: (values) => (applyVideo(editor, String(values.url ?? '')) ? null : labels.get('videoInvalid')),
        onClose: () => editor.commands.focus(),
    });
};
