import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

// Only the empty default document; Tiptap's isEmpty is also true for an empty table or list, which is content.
export const isEmptyDocument = (doc: ProseMirrorNode): boolean =>
    doc.childCount === 1 && doc.firstChild?.type.name === 'paragraph' && doc.firstChild.content.size === 0;

/** The value the field submits for the editor's document: its HTML, or '' for the empty document. */
export const serializeDocument = (editor: Editor): string =>
    isEmptyDocument(editor.state.doc) ? '' : editor.getHTML();
