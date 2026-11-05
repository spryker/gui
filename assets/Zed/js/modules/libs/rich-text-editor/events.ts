// DOM events dispatched on the field's textarea; they bubble, so a form or page can listen once.
export const RICH_TEXT_EDITOR_EVENT_READY = 'rich-text-editor:ready';
export const RICH_TEXT_EDITOR_EVENT_CHANGE = 'rich-text-editor:change';
/** The field switched between the visual editor and the HTML source; `detail.isSourceMode`. */
export const RICH_TEXT_EDITOR_EVENT_MODE_CHANGE = 'rich-text-editor:mode-change';

export const dispatchRichTextEditorEvent = (textarea: HTMLTextAreaElement, type: string, detail: object = {}): void => {
    textarea.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
};
