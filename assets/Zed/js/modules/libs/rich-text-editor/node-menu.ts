import { Extension } from '@tiptap/core';
import type { AnyExtension, Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import { createItemButton } from './toolbar/button';
import type { NodeMenuDefinition, ToolbarItemDefinition } from './types';

export interface NodeMenu {
    /** Attached to the page by BubbleMenu only while the menu shows. */
    readonly element: HTMLElement;
    readonly extensions: readonly AnyExtension[];
    isShown(editor: Editor): boolean;
    /** Hides the menu at once, e.g. when the field switches to its HTML source, which does not blur the editor. */
    hide(editor: Editor): void;
    /** Places a shown menu again after a layout change without a transaction, e.g. entering fullscreen. */
    updatePosition(editor: Editor): void;
}

export interface NodeMenuOptions {
    /** False while the field shows its HTML source. */
    isVisualMode(): boolean;
}

interface MenuButton {
    readonly item: ToolbarItemDefinition;
    readonly button: HTMLButtonElement;
}

// BubbleMenu reacts to these transaction metas under its plugin key (extension-bubble-menu, transactionHandler).
const HIDE_META = 'hide';
const UPDATE_POSITION_META = 'updatePosition';

const createMenuButton = (editor: Editor, item: ToolbarItemDefinition, showLabel: boolean): MenuButton => {
    const button = createItemButton(item, { showLabel });
    button.addEventListener('click', () => item.run(editor));

    return { item, button };
};

const refreshButtons = (editor: Editor, buttons: readonly MenuButton[]): void => {
    for (const { item, button } of buttons) {
        button.disabled = item.isEnabled !== undefined && !item.isEnabled(editor);

        if (item.kind === 'toggle') {
            button.setAttribute('aria-pressed', String(item.isActive?.(editor) ?? false));
        }
    }
};

const createCaption = (): HTMLSpanElement => {
    const caption = document.createElement('span');
    caption.className = 'rich-text-editor__node-menu-caption';

    return caption;
};

/**
 * One bubble menu per node menu (e.g. a link, a table, the ContentGui content item), shown while its node is
 * selected. Alt+F10 moves the focus into it (the WAI-ARIA editor-toolbar convention); Escape gives it back to the
 * editor. Its buttons follow `isEnabled` and `isActive` like the toolbar's.
 */
export const createNodeMenus = (
    menus: readonly NodeMenuDefinition[],
    options: NodeMenuOptions = { isVisualMode: () => true },
): NodeMenu[] =>
    menus.map((menu) => {
        const pluginKey = `nodeMenu-${menu.nodeName}`;
        const element = document.createElement('div');
        const caption = menu.caption === undefined ? null : createCaption();
        let buttons: MenuButton[] = [];
        const isShown = (editor: Editor): boolean =>
            editor.isEditable && options.isVisualMode() && (menu.isShown?.(editor) ?? editor.isActive(menu.nodeName));

        element.className = 'rich-text-editor__node-menu';
        element.setAttribute('role', 'toolbar');
        element.setAttribute('aria-label', menu.label ?? menu.nodeName);

        const extensions = [
            // Its own name: Tiptap keys extensions by name, and an editor has several node menus.
            BubbleMenu.extend({ name: `${pluginKey}-bubble` }).configure({
                pluginKey,
                element,
                shouldShow: ({ editor }) => isShown(editor),
            }),
            Extension.create({
                name: pluginKey,

                // Synchronous, unlike onCreate (emitted after a timeout), so the menu is complete before it can show.
                onBeforeCreate({ editor }) {
                    buttons = menu.items.map((item) => createMenuButton(editor, item, menu.showLabels ?? true));
                    element.replaceChildren(
                        ...(caption === null ? [] : [caption]),
                        ...buttons.map(({ button }) => button),
                    );
                    element.addEventListener('keydown', (event) => {
                        if (event.key === 'Escape') {
                            event.preventDefault();
                            editor.commands.focus();
                        }
                    });
                },

                onTransaction({ editor }) {
                    if (!isShown(editor)) {
                        return;
                    }

                    if (caption !== null) {
                        caption.textContent = menu.caption?.(editor) ?? '';
                        caption.title = caption.textContent;
                    }

                    refreshButtons(editor, buttons);
                },

                addKeyboardShortcuts() {
                    return {
                        'Alt-F10': () => {
                            if (!isShown(this.editor)) {
                                return false;
                            }

                            element.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();

                            return true;
                        },
                    };
                },
            }),
        ];

        return {
            element,
            extensions,
            isShown,
            hide: (editor: Editor) => editor.view.dispatch(editor.state.tr.setMeta(pluginKey, HIDE_META)),
            updatePosition: (editor: Editor) =>
                editor.view.dispatch(editor.state.tr.setMeta(pluginKey, UPDATE_POSITION_META)),
        };
    });
