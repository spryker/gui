import type { ToolbarItemDefinition } from '../types';
import { createIconElement } from './icons';
import { describeShortcut } from './shortcuts';

const BUTTON_CLASS_NAME = 'rich-text-editor__button';

const createIcon = (item: ToolbarItemDefinition): Element | null => {
    if (item.iconShape !== undefined) {
        return createIconElement(item.iconShape);
    }

    if (item.icon === undefined) {
        return null;
    }

    const icon = document.createElement('i');
    icon.className = `${item.icon} rich-text-editor__icon`;
    icon.setAttribute('aria-hidden', 'true');

    return icon;
};

/**
 * A ghost button for a toolbar or node menu item. `type="button"` everywhere: the editor sits inside the page's
 * form, where a bare `<button>` would submit it. Without an icon, the label is shown as text.
 */
export const createItemButton = (
    item: ToolbarItemDefinition,
    options: { showLabel?: boolean } = {},
): HTMLButtonElement => {
    const button = document.createElement('button');
    const shortcut = item.shortcut === undefined ? null : describeShortcut(item.shortcut);
    button.type = 'button';
    button.className = BUTTON_CLASS_NAME;
    button.title = shortcut === null ? item.label : `${item.label} (${shortcut.label})`;
    button.dataset.itemId = item.id;
    button.setAttribute('aria-label', item.label);

    if (shortcut !== null) {
        button.setAttribute('aria-keyshortcuts', shortcut.ariaKeyShortcuts);
    }

    if (item.kind === 'toggle') {
        button.setAttribute('aria-pressed', 'false');
    }

    const icon = createIcon(item);

    if (icon === null) {
        button.textContent = item.label;

        return button;
    }

    button.append(icon);

    if (options.showLabel) {
        const label = document.createElement('span');
        label.className = 'rich-text-editor__button-label';
        label.textContent = item.label;
        button.append(label);
    }

    return button;
};
