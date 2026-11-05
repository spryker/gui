import type { SourceView, SourceViewOptions } from './source-view';

export interface SourceViewModule {
    createSourceView(options: SourceViewOptions): SourceView;
}

export type LoadSourceView = () => Promise<SourceViewModule>;

/**
 * Source mode over the field's textarea, which always holds the HTML being edited (and submitted). The textarea
 * is shown at once; CodeMirror replaces it once its chunk has loaded, and stays in sync with it. If the chunk
 * cannot load, the textarea remains the source editor.
 */
export class SourcePane {
    protected view: SourceView | null = null;

    protected module: Promise<SourceViewModule> | null = null;

    protected isShown = false;

    protected isReadOnly = false;

    constructor(
        protected readonly textarea: HTMLTextAreaElement,
        protected readonly loadSourceView: LoadSourceView,
        protected readonly label: string,
        protected readonly onChange: () => void,
    ) {}

    async show(readOnly: boolean): Promise<void> {
        this.isShown = true;
        this.isReadOnly = readOnly;
        this.textarea.readOnly = readOnly;

        if (this.view !== null) {
            this.view.setText(this.textarea.value);
            this.view.setReadOnly(readOnly);

            return;
        }

        this.textarea.hidden = false;
        await this.mount();
    }

    hide(): void {
        this.isShown = false;
        this.view?.destroy();
        this.view = null;
    }

    insert(text: string): void {
        if (this.view !== null) {
            this.view.insertText(text);

            return;
        }

        this.textarea.setRangeText(text, this.textarea.selectionStart, this.textarea.selectionEnd, 'end');
        this.onChange();
    }

    setReadOnly(readOnly: boolean): void {
        this.isReadOnly = readOnly;
        this.textarea.readOnly = readOnly;
        this.view?.setReadOnly(readOnly);
    }

    focus(): void {
        if (this.view !== null) {
            this.view.focus();

            return;
        }

        this.textarea.focus();
    }

    destroy(): void {
        this.hide();
    }

    protected async mount(): Promise<void> {
        let sourceViewModule: SourceViewModule;

        try {
            this.module ??= this.loadSourceView();
            sourceViewModule = await this.module;
        } catch (error) {
            this.module = null;
            console.error(
                'Failed to load the HTML source editor; the plain text area is used instead. This is usually a ' +
                    'stale or missing file under public/Backoffice/assets/js/chunks — rebuild the Back Office assets ' +
                    'with "npm run zed" and reload.',
                error,
            );

            return;
        }

        // The user may have left source mode, or another show() mounted the view, while the chunk was loading.
        if (!this.isShown || this.view !== null) {
            return;
        }

        try {
            this.view = sourceViewModule.createSourceView({
                text: this.textarea.value,
                readOnly: this.isReadOnly,
                label: this.label,
                onChange: (text: string) => {
                    this.textarea.value = text;
                    this.onChange();
                },
            });
        } catch (error) {
            console.error('Failed to create the HTML source editor; the plain text area is used instead.', error);

            return;
        }

        this.textarea.before(this.view.dom);
        this.textarea.hidden = true;
    }
}
