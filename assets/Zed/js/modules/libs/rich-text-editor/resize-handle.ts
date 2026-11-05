const KEYBOARD_STEP_PX = 20;
const KEY_STEPS: Readonly<Record<string, number>> = { ArrowUp: -KEYBOARD_STEP_PX, ArrowDown: KEYBOARD_STEP_PX };

const readMinHeight = (target: HTMLElement): number => Number.parseFloat(getComputedStyle(target).minHeight) || 0;

const readHeight = (target: HTMLElement): number => Math.round(target.getBoundingClientRect().height);

/**
 * Summernote's resize bar, keyboard-operable: a focusable separator below `target` whose arrow keys (20px) and
 * pointer drag set its height. A set height lifts the CSS height cap, never the minimum height.
 */
export const createResizeHandle = (target: HTMLElement, label: string): HTMLElement => {
    const handle = document.createElement('div');
    let dragStart: { readonly pointerY: number; readonly height: number } | null = null;

    const setHeight = (height: number): void => {
        const clampedHeight = Math.max(readMinHeight(target), Math.round(height));
        target.style.height = `${clampedHeight}px`;
        target.style.maxHeight = 'none';
        handle.setAttribute('aria-valuenow', String(clampedHeight));
    };

    handle.className = 'rich-text-editor__resize';
    handle.tabIndex = 0;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'horizontal');
    handle.setAttribute('aria-label', label);
    handle.setAttribute('aria-valuemin', String(readMinHeight(target)));
    handle.setAttribute('aria-valuenow', String(readHeight(target)));

    handle.addEventListener('keydown', (event) => {
        const step = KEY_STEPS[event.key];

        if (step === undefined) {
            return;
        }

        event.preventDefault();
        setHeight(readHeight(target) + step);
    });
    handle.addEventListener('pointerdown', (event) => {
        // Keeps the moves coming while the pointer leaves the thin handle during the drag.
        handle.setPointerCapture(event.pointerId);
        dragStart = { pointerY: event.clientY, height: readHeight(target) };
    });
    handle.addEventListener('pointermove', (event) => {
        if (dragStart !== null) {
            setHeight(dragStart.height + event.clientY - dragStart.pointerY);
        }
    });

    const endDrag = (): void => {
        dragStart = null;
    };

    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);

    return handle;
};
