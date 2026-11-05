const FULLSCREEN_CLASS = 'rich-text-editor--fullscreen';
// On <body>, not as an inline style: Bootstrap's modal restores the inline overflow it found when it closes.
const PAGE_CLASS = 'rich-text-editor-fullscreen-open';
// Where the source pane starts. It is a sibling of the editor (dom.ts), so the property is inherited from <body>;
// only one editor is in fullscreen at a time.
const SOURCE_TOP_PROPERTY = '--rich-text-editor-fullscreen-top';
const ESCAPE_KEY = 'Escape';
const MODAL_SELECTOR = '.modal';
// Bootstrap prevents the default of every Esc on a menu toggle, also of a closed menu's; the Esc that closes an
// open menu stops its propagation instead (bootstrap/js/src/dropdown.js `dataApiKeydownHandler`).
const MENU_TOGGLE_SELECTOR = '[data-bs-toggle="dropdown"]';
const TOOLBAR_TAB_STOP_SELECTOR = '[role="toolbar"] [tabindex="0"]';
const EDITABLE_SELECTOR = '[contenteditable]';
const SOURCE_MODE_CLASS = 'rich-text-editor--source';
const CODE_MIRROR_CONTENT_SELECTOR = '.cm-content';

export interface Fullscreen {
    isActive(): boolean;
    toggle(): void;
    /** Re-measures where the source pane starts, e.g. when source mode starts. */
    refresh(): void;
    destroy(): void;
}

/** The editor's parts above the source pane: the notice and the toolbar below it. */
export interface FullscreenLayout {
    readonly root: HTMLElement;
    readonly notice: HTMLElement;
    readonly toolbar: HTMLElement;
}

/**
 * The editor fills the window: the root becomes fixed, the page behind it stops scrolling, and in source mode the
 * source pane (a sibling of the root) is fixed below the toolbar, re-measured whenever the notice or the toolbar
 * changes size. Esc leaves, unless something else handled it (an open menu, CodeMirror's search panel) or it came
 * from a dialog above the editor. Focus stays in the editor: Tab past its end or before its start wraps around
 * instead of reaching the page controls hidden behind it.
 */
export const createFullscreen = ({ root, notice, toolbar }: FullscreenLayout, onChange: () => void): Fullscreen => {
    let isActive = false;

    const measure = (): void => {
        document.body.style.setProperty(SOURCE_TOP_PROPERTY, `${toolbar.getBoundingClientRect().bottom}px`);
    };
    let layoutObserver: ResizeObserver | null = null;

    const isEscapeForFullscreen = (event: KeyboardEvent): boolean => {
        const target = event.target instanceof Element ? event.target : null;
        const modal = target?.closest(MODAL_SELECTOR) ?? null;
        const isFromDialog = modal !== null && !modal.contains(root);
        const isHandled = event.defaultPrevented && target?.matches(MENU_TOGGLE_SELECTOR) !== true;

        return event.key === ESCAPE_KEY && !isFromDialog && !isHandled;
    };

    // In source mode the source pane (CodeMirror, or the textarea when it cannot load) follows the root.
    const sourcePane = (): Element | null =>
        root.classList.contains(SOURCE_MODE_CLASS) ? root.nextElementSibling : null;

    const focusEdge = (isStart: boolean): void => {
        const pane = sourcePane();
        const end =
            pane === null
                ? root.querySelector<HTMLElement>(EDITABLE_SELECTOR)
                : (pane.querySelector<HTMLElement>(CODE_MIRROR_CONTENT_SELECTOR) ?? (pane as HTMLElement));

        (isStart ? root.querySelector<HTMLElement>(TOOLBAR_TAB_STOP_SELECTOR) : end)?.focus();
    };

    const onFocusIn = (event: FocusEvent): void => {
        const target = event.target;

        if (
            !(target instanceof Element) ||
            root.contains(target) ||
            sourcePane()?.contains(target) === true ||
            target.closest(MODAL_SELECTOR) !== null
        ) {
            return;
        }

        focusEdge((root.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
    };

    const onKeydown = (event: KeyboardEvent): void => {
        if (isEscapeForFullscreen(event)) {
            leave();
            onChange();
        }
    };

    const leave = (): void => {
        isActive = false;
        root.classList.remove(FULLSCREEN_CLASS);
        document.body.classList.remove(PAGE_CLASS);
        document.body.style.removeProperty(SOURCE_TOP_PROPERTY);
        window.removeEventListener('keydown', onKeydown);
        document.removeEventListener('focusin', onFocusIn);
        layoutObserver?.disconnect();
        layoutObserver = null;
    };

    const enter = (): void => {
        isActive = true;
        root.classList.add(FULLSCREEN_CLASS);
        document.body.classList.add(PAGE_CLASS);
        measure();
        window.addEventListener('keydown', onKeydown);
        document.addEventListener('focusin', onFocusIn);
        layoutObserver = new ResizeObserver(measure);
        layoutObserver.observe(notice);
        layoutObserver.observe(toolbar);
    };

    return {
        isActive: () => isActive,
        toggle(): void {
            if (isActive) {
                leave();
            } else {
                enter();
            }

            onChange();
        },
        refresh(): void {
            if (isActive) {
                measure();
            }
        },
        destroy(): void {
            if (isActive) {
                leave();
            }
        },
    };
};
