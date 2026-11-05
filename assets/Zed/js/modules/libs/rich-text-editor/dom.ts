export interface EditorDom {
    readonly root: HTMLDivElement;
    readonly notice: HTMLDivElement;
    readonly toolbar: HTMLDivElement;
    readonly content: HTMLDivElement;
    /** A transient notice (e.g. a refused paste) hides itself; a persistent one (the content guard) stays. */
    showNotice(message: string, isTransient?: boolean): void;
    hideNotice(): void;
}

const TRANSIENT_NOTICE_MS = 6000;

const createElement = (className: string): HTMLDivElement => {
    const element = document.createElement('div');
    element.className = className;

    return element;
};

/**
 * The editor sits right before its textarea, which stays where it is in the form (it keeps the field's `name`
 * and the Symfony error markup after it) and doubles as the HTML source view, then shown below the toolbar.
 */
export const createEditorDom = (textarea: HTMLTextAreaElement): EditorDom => {
    const root = createElement('rich-text-editor');
    const notice = createElement('rich-text-editor__notice alert alert-warning');
    const toolbar = createElement('rich-text-editor__toolbar');
    const content = createElement('rich-text-editor__content');

    notice.setAttribute('role', 'status');
    notice.hidden = true;
    root.append(notice, toolbar, content);
    textarea.before(root);
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const hideNotice = (): void => {
        clearTimeout(hideTimer);
        notice.textContent = '';
        notice.hidden = true;
    };

    return {
        root,
        notice,
        toolbar,
        content,
        showNotice(message: string, isTransient = false): void {
            clearTimeout(hideTimer);
            notice.textContent = message;
            notice.hidden = false;

            if (isTransient) {
                hideTimer = setTimeout(hideNotice, TRANSIENT_NOTICE_MS);
            }
        },
        hideNotice,
    };
};
