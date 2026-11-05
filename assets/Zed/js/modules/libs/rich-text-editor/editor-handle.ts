import { Editor, getSchema } from '@tiptap/core';
import type { AnyExtension } from '@tiptap/core';
import type { Node as ProseMirrorNode, Schema } from '@tiptap/pm/model';
import { VALID_CONTENT, buildGuardNotice, checkContent } from './content-check';
import type { EditorDom } from './dom';
import {
    RICH_TEXT_EDITOR_EVENT_CHANGE,
    RICH_TEXT_EDITOR_EVENT_MODE_CHANGE,
    dispatchRichTextEditorEvent,
} from './events';
import { bindForm, createEditableAttributes } from './form-binding';
import type { FormBinding } from './form-binding';
import { isEmptyDocument, serializeDocument } from './serialize';
import { SourcePane } from './source-pane';
import type { LoadSourceView } from './source-pane';
import type { ContentCheckResult, Labels, RichTextEditorHandle } from './types';

const SOURCE_MODE_CLASS_NAME = 'rich-text-editor--source';

export interface RichTextEditorControllerOptions {
    readonly labels: Labels;
    loadSourceView: LoadSourceView;
    onDestroy(): void;
}

/**
 * Two modes over one textarea: `visual` (the Tiptap editor; the hidden textarea follows every change) and
 * `source` (the HTML, in CodeMirror once loaded, kept in the textarea that is submitted). Content the schema
 * cannot represent is never converted: the field is put into source mode with a notice instead.
 */
export class RichTextEditorController implements RichTextEditorHandle {
    protected mode: 'visual' | 'source' = 'visual';

    protected isDisabled: boolean;

    // Until the document changes, the textarea keeps the stored bytes, so saving an unedited field rewrites nothing.
    protected isDocumentChanged = false;

    // The visual document and its HTML when source mode was entered from the visual editor; null otherwise, e.g. when
    // the content guard opened source mode, as the visual editor then does not hold that HTML.
    protected sourceSnapshot: { readonly html: string; readonly doc: ProseMirrorNode } | null = null;

    protected readonly isOriginallyReadOnly: boolean;

    protected readonly schema: Schema;

    protected readonly editor: Editor;

    protected readonly binding: FormBinding;

    protected readonly cleanups: (() => void)[] = [];

    protected readonly sourcePane: SourcePane;

    constructor(
        readonly textarea: HTMLTextAreaElement,
        protected readonly dom: EditorDom,
        extensions: AnyExtension[],
        protected readonly options: RichTextEditorControllerOptions,
    ) {
        this.isOriginallyReadOnly = textarea.readOnly;
        this.isDisabled = textarea.disabled || textarea.readOnly;
        this.schema = getSchema(extensions);
        this.binding = bindForm(textarea, {
            onSubmit: () => this.syncToTextarea(),
            onLabelClick: () => this.focus(),
            onSourceInput: () => this.dispatchChange(),
        });
        this.sourcePane = new SourcePane(textarea, options.loadSourceView, options.labels.get('source'), () =>
            this.dispatchChange(),
        );

        const initialCheck = checkContent(textarea.value, this.schema);

        try {
            this.editor = new Editor({
                element: dom.content,
                extensions,
                content: initialCheck.isValid ? textarea.value : '',
                editable: !this.isDisabled,
                editorProps: { attributes: createEditableAttributes(textarea, this.binding.labelId) },
                onUpdate: ({ transaction }) => this.onEditorUpdate(transaction.docChanged),
            });
        } catch (error) {
            // Otherwise the submit listener would outlive the failed editor.
            this.binding.destroy();

            throw error;
        }

        if (initialCheck.isValid) {
            this.showVisual();

            return;
        }

        void this.showSource(initialCheck);
    }

    /** For the Gui toolbar and features built on the editor instance; not part of RichTextEditorHandle. */
    getTiptapEditor(): Editor {
        return this.editor;
    }

    /** Runs on destroy(), before the editor is torn down. */
    registerCleanup(cleanup: () => void): void {
        this.cleanups.push(cleanup);
    }

    getHtml(): string {
        return this.mode === 'source' ? this.textarea.value : serializeDocument(this.editor);
    }

    setHtml(html: string, options: { emitChange?: boolean } = {}): ContentCheckResult {
        const result = checkContent(html, this.schema);
        this.applyHtml(html, result);

        if (options.emitChange ?? true) {
            this.dispatchChange();
        }

        return result;
    }

    insertHtml(html: string): ContentCheckResult {
        const result = checkContent(html, this.schema);

        if (!result.isValid) {
            return result;
        }

        if (this.mode === 'source') {
            this.sourcePane.insert(html);

            return result;
        }

        this.editor.commands.insertContent(html);

        return result;
    }

    isEmpty(): boolean {
        return this.mode === 'source' ? this.textarea.value.trim() === '' : isEmptyDocument(this.editor.state.doc);
    }

    isSourceMode(): boolean {
        return this.mode === 'source';
    }

    async setSourceMode(enabled: boolean): Promise<ContentCheckResult> {
        if (enabled && this.mode === 'visual') {
            this.syncToTextarea();
            this.sourceSnapshot = { html: this.textarea.value, doc: this.editor.state.doc };
        }

        if (enabled) {
            await this.showSource(VALID_CONTENT);

            return VALID_CONTENT;
        }

        // An unedited source returns to the document it was opened from, so viewing the HTML normalizes nothing.
        if (this.sourceSnapshot?.html === this.textarea.value && this.sourceSnapshot.doc === this.editor.state.doc) {
            this.showVisual();
        }

        if (this.mode === 'visual') {
            return VALID_CONTENT;
        }

        return this.setHtml(this.textarea.value, { emitChange: false });
    }

    setDisabled(disabled: boolean): void {
        this.isDisabled = disabled;
        this.editor.setEditable(!disabled);
        this.sourcePane.setReadOnly(this.isOriginallyReadOnly || disabled);
    }

    focus(): void {
        if (this.mode === 'source') {
            this.sourcePane.focus();

            return;
        }

        this.editor.commands.focus();
    }

    syncToTextarea(): void {
        // In source mode the textarea is the source of truth and already holds what the user typed.
        if (this.mode === 'visual' && this.isDocumentChanged) {
            this.textarea.value = serializeDocument(this.editor);
        }
    }

    destroy(): void {
        this.syncToTextarea();
        this.cleanups.splice(0).forEach((cleanup) => cleanup());
        this.dom.hideNotice();
        this.sourcePane.destroy();
        this.editor.destroy();
        this.binding.destroy();
        this.dom.root.remove();
        this.textarea.hidden = false;
        this.textarea.readOnly = this.isOriginallyReadOnly;
        this.options.onDestroy();
    }

    protected applyHtml(html: string, result: ContentCheckResult): void {
        if (!result.isValid) {
            this.textarea.value = html;
            void this.showSource(result);

            return;
        }

        this.editor.commands.setContent(html, { emitUpdate: false });
        this.isDocumentChanged = true;
        this.showVisual();
        this.textarea.value = serializeDocument(this.editor);
    }

    protected onEditorUpdate(isDocumentChanged: boolean): void {
        // setEditable() also emits an update, without a change to the document.
        if (this.mode !== 'visual' || !isDocumentChanged) {
            return;
        }

        this.isDocumentChanged = true;

        this.textarea.value = serializeDocument(this.editor);
        this.dispatchChange();
    }

    protected dispatchChange(): void {
        dispatchRichTextEditorEvent(this.textarea, RICH_TEXT_EDITOR_EVENT_CHANGE);
    }

    protected showVisual(): void {
        this.mode = 'visual';
        this.sourceSnapshot = null;
        this.sourcePane.hide();
        this.dom.hideNotice();
        this.dom.content.hidden = false;
        this.textarea.hidden = true;
        this.textarea.readOnly = this.isOriginallyReadOnly;
        this.dom.root.classList.remove(SOURCE_MODE_CLASS_NAME);
        dispatchRichTextEditorEvent(this.textarea, RICH_TEXT_EDITOR_EVENT_MODE_CHANGE, { isSourceMode: false });
    }

    protected showSource(result: ContentCheckResult): Promise<void> {
        this.mode = 'source';
        this.dom.content.hidden = true;
        this.dom.root.classList.add(SOURCE_MODE_CLASS_NAME);
        // Before the event: its listeners see the final layout (fullscreen measures the toolbar's position).
        this.updateGuardNotice(result);
        dispatchRichTextEditorEvent(this.textarea, RICH_TEXT_EDITOR_EVENT_MODE_CHANGE, { isSourceMode: true });

        return this.sourcePane.show(this.isOriginallyReadOnly || this.isDisabled);
    }

    protected updateGuardNotice(result: ContentCheckResult): void {
        if (result.isValid) {
            this.dom.hideNotice();

            return;
        }

        this.dom.showNotice(buildGuardNotice(result, this.options.labels));
    }
}
