import type { Editor } from '@tiptap/core';
import type { ToolbarItemDefinition, ToolbarMenuItem } from '../types';
import { createItemButton } from './button';
import { createIconElement } from './icons';
import { ICON_CHEVRON_DOWN } from './tiptap-insert-icons';

export interface ToolbarGroup {
    readonly name: string;
    readonly items: readonly ToolbarItemDefinition[];
}

export interface ToolbarOptions {
    readonly ariaLabel: string;
    /** The items that stay usable in source mode: the source toggle itself and fullscreen. */
    readonly sourceModeItemIds: readonly string[];
    isSourceMode(): boolean;
}

export interface Toolbar {
    refresh(): void;
    destroy(): void;
}

interface ToolbarControl {
    readonly item: ToolbarItemDefinition;
    readonly element: HTMLButtonElement;
}

const ROVING_KEYS = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];

interface MenuEntry {
    readonly menuItem: ToolbarMenuItem;
    readonly button: HTMLButtonElement;
    readonly isChoice: boolean;
}

const createMenuEntry = (menuItem: ToolbarMenuItem, isChoice: boolean, onSelect: () => void): MenuEntry => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dropdown-item rich-text-editor__menu-item';
    button.setAttribute('role', isChoice ? 'menuitemradio' : 'menuitem');
    button.addEventListener('click', onSelect);

    if (menuItem.swatch !== undefined) {
        const swatchElement = document.createElement('span');
        swatchElement.className = 'rich-text-editor__swatch';
        swatchElement.style.backgroundColor = menuItem.swatch;
        swatchElement.setAttribute('aria-hidden', 'true');
        button.append(swatchElement);
    }

    button.append(menuItem.label);

    return { menuItem, button, isChoice };
};

// A closed menu needs no state, so the entries are brought up to date only as the menu opens.
const refreshMenuEntries = (editor: Editor, item: ToolbarItemDefinition, entries: readonly MenuEntry[]): void => {
    const activeValue = item.activeValue?.(editor) ?? null;

    for (const { menuItem, button, isChoice } of entries) {
        button.disabled = menuItem.isEnabled !== undefined && !menuItem.isEnabled(editor);

        if (isChoice) {
            button.setAttribute('aria-checked', String(menuItem.value === activeValue));
        }
    }
};

// Bootstrap 5's dropdown data API (loaded in commons) opens the menu and handles its keyboard navigation.
const createMenu = (
    editor: Editor,
    item: ToolbarItemDefinition,
    run: (value: string) => void,
): [HTMLElement, HTMLButtonElement] => {
    const wrapper = document.createElement('div');
    const toggle = createItemButton(item);
    const list = document.createElement('ul');
    const entries = (item.menuItems ?? []).map((menuItem) =>
        createMenuEntry(menuItem, item.activeValue !== undefined && !menuItem.isAction, () => run(menuItem.value)),
    );

    wrapper.className = 'dropdown';
    toggle.classList.add('rich-text-editor__button--menu');
    toggle.append(createIconElement(ICON_CHEVRON_DOWN, 'rich-text-editor__chevron'));
    toggle.dataset.bsToggle = 'dropdown';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-haspopup', 'menu');
    toggle.addEventListener('show.bs.dropdown', () => refreshMenuEntries(editor, item, entries));
    list.className = 'dropdown-menu rich-text-editor__menu';
    list.setAttribute('role', 'menu');
    list.setAttribute('aria-label', item.label);
    list.append(
        ...entries.map(({ button }) => {
            const entry = document.createElement('li');
            entry.setAttribute('role', 'none');
            entry.append(button);

            return entry;
        }),
    );
    wrapper.append(toggle, list);

    return [wrapper, toggle];
};

const createSeparator = (): HTMLDivElement => {
    const separator = document.createElement('div');
    separator.className = 'rich-text-editor__separator';
    separator.setAttribute('role', 'separator');
    separator.setAttribute('aria-orientation', 'vertical');

    return separator;
};

// Disabled buttons cannot take the focus, so the arrow keys move between the enabled ones only.
const moveFocus = (controls: readonly ToolbarControl[], current: number, key: string): number => {
    const enabled = controls.flatMap(({ element }, index) => (element.disabled ? [] : [index]));
    const position = enabled.indexOf(current);
    const lastPosition = enabled.length - 1;
    const targets: Record<string, number | undefined> = {
        ArrowRight: enabled[position === lastPosition ? 0 : position + 1],
        ArrowLeft: enabled[position <= 0 ? lastPosition : position - 1],
        Home: enabled[0],
        End: enabled[lastPosition],
    };

    return targets[key] ?? current;
};

const setTabStop = (controls: readonly ToolbarControl[], tabStop: number): void => {
    controls.forEach(({ element }, index) => (element.tabIndex = index === tabStop ? 0 : -1));
};

// The one Tab stop of the toolbar must stay on an enabled control (e.g. the source toggle in source mode, or
// once undo runs out of history), or the whole toolbar drops out of the Tab order.
const keepTabStopEnabled = (controls: readonly ToolbarControl[]): void => {
    const tabStop = controls.find(({ element }) => element.tabIndex === 0);
    const firstEnabled = controls.findIndex(({ element }) => !element.disabled);

    if (tabStop?.element.disabled && firstEnabled !== -1) {
        setTabStop(controls, firstEnabled);
    }
};

export const renderToolbar = (
    container: HTMLElement,
    editor: Editor,
    groups: readonly ToolbarGroup[],
    options: ToolbarOptions,
): Toolbar => {
    const controls: ToolbarControl[] = [];

    const refresh = (): void => {
        const isSourceMode = options.isSourceMode();

        for (const { item, element } of controls) {
            element.disabled =
                !editor.isEditable ||
                (isSourceMode && !options.sourceModeItemIds.includes(item.id)) ||
                (!isSourceMode && item.isEnabled !== undefined && !item.isEnabled(editor));

            if (item.kind === 'toggle') {
                element.setAttribute('aria-pressed', String(item.isActive?.(editor) ?? false));
            }
        }

        keepTabStopEnabled(controls);
    };

    const run = (item: ToolbarItemDefinition, value?: string): void => {
        // Commands do not check editability themselves; a disabled field must not change through its toolbar.
        if (!editor.isEditable) {
            return;
        }

        item.run(editor, value);
        refresh();
    };

    const onKeydown = (event: KeyboardEvent): void => {
        const current = controls.findIndex(({ element }) => element === event.target);

        if (current === -1 || !ROVING_KEYS.includes(event.key)) {
            return;
        }

        event.preventDefault();
        const next = moveFocus(controls, current, event.key);
        setTabStop(controls, next);
        controls[next]?.element.focus();
    };

    container.setAttribute('role', 'toolbar');
    container.setAttribute('aria-label', options.ariaLabel);

    for (const [index, group] of groups.filter(({ items }) => items.length > 0).entries()) {
        if (index > 0) {
            container.append(createSeparator());
        }

        const groupElement = document.createElement('div');
        groupElement.className = 'rich-text-editor__group';
        groupElement.setAttribute('role', 'group');
        groupElement.dataset.group = group.name;

        for (const item of group.items) {
            const [element, control] =
                item.kind === 'menu'
                    ? createMenu(editor, item, (value) => run(item, value))
                    : [createItemButton(item), null];
            const button = control ?? (element as HTMLButtonElement);

            if (control === null) {
                button.addEventListener('click', () => run(item));
            }

            button.tabIndex = controls.length === 0 ? 0 : -1;
            controls.push({ item, element: button });
            groupElement.append(element);
        }

        container.append(groupElement);
    }

    container.addEventListener('keydown', onKeydown);
    editor.on('transaction', refresh);
    // setEditable() emits only an update.
    editor.on('update', refresh);
    refresh();

    return {
        refresh,
        destroy(): void {
            editor.off('transaction', refresh);
            editor.off('update', refresh);
            container.removeEventListener('keydown', onKeydown);
            container.replaceChildren();
        },
    };
};
