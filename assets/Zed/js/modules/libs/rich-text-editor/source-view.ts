import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { StreamLanguage, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { html } from '@codemirror/legacy-modes/mode/xml';
import { search, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';

export const SOURCE_VIEW_CLASS_NAME = 'rich-text-editor__source';

export interface SourceViewOptions {
    readonly text: string;
    readonly readOnly: boolean;
    /** The accessible name of the code area, e.g. "HTML source". */
    readonly label: string;
    onChange(text: string): void;
}

export interface SourceView {
    readonly dom: HTMLElement;
    getText(): string;
    setText(text: string): void;
    insertText(text: string): void;
    setReadOnly(readOnly: boolean): void;
    focus(): void;
    destroy(): void;
}

const readOnlyExtensions = (readOnly: boolean) => [
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
];

/**
 * CodeMirror 6 over the field's HTML, loaded only when source mode is first used. `indentWithTab` is left out on
 * purpose: Tab keeps moving the focus out of the code area instead of trapping keyboard users in it. Ctrl/Cmd+F
 * opens CodeMirror's find and replace panel: the view renders only the visible lines, so the browser's own find
 * misses most of the HTML.
 */
export const createSourceView = (options: SourceViewOptions): SourceView => {
    const editable = new Compartment();
    // setText() mirrors a value the caller already holds, so its update is not reported back as a change.
    let isMirroring = false;
    const view = new EditorView({
        state: EditorState.create({
            doc: options.text,
            extensions: [
                lineNumbers(),
                history(),
                search({ top: true }),
                keymap.of([...searchKeymap, ...defaultKeymap, ...historyKeymap]),
                StreamLanguage.define(html),
                syntaxHighlighting(defaultHighlightStyle),
                EditorView.lineWrapping,
                // Not classList.add(): CodeMirror rewrites its root's class attribute on updates such as focus.
                EditorView.editorAttributes.of({ class: SOURCE_VIEW_CLASS_NAME }),
                EditorView.contentAttributes.of({ 'aria-label': options.label }),
                editable.of(readOnlyExtensions(options.readOnly)),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged && !isMirroring) {
                        options.onChange(update.state.doc.toString());
                    }
                }),
            ],
        }),
    });

    const replace = (from: number, to: number, text: string): void => {
        view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } });
    };

    return {
        dom: view.dom,
        getText: () => view.state.doc.toString(),
        setText: (text: string) => {
            if (text === view.state.doc.toString()) {
                return;
            }

            isMirroring = true;
            replace(0, view.state.doc.length, text);
            isMirroring = false;
        },
        insertText: (text: string) => {
            const { from, to } = view.state.selection.main;
            replace(from, to, text);
        },
        setReadOnly: (readOnly: boolean) => {
            view.dispatch({ effects: editable.reconfigure(readOnlyExtensions(readOnly)) });
        },
        focus: () => view.focus(),
        destroy: () => view.destroy(),
    };
};
