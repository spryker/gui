import { isMacOS } from '@tiptap/core';

/** Opens the link dialog; no Tiptap extension binds it (`createLinkDialogShortcut`). */
export const LINK_DIALOG_SHORTCUT = 'Mod-k';

export interface ShortcutDescription {
    /** For the tooltip, e.g. `Ctrl+Shift+Z` or `⇧⌘Z`. */
    readonly label: string;
    /** For `aria-keyshortcuts`, e.g. `Control+Shift+Z` or `Meta+Shift+Z`. */
    readonly ariaKeyShortcuts: string;
}

interface Modifier {
    readonly name: string;
    readonly label: string;
    readonly macLabel: string;
    readonly aria: string;
    readonly macAria: string;
}

// In the order each platform writes them: Ctrl+Alt+Shift+B on Windows and Linux, ⌥⇧⌘B on macOS.
const MODIFIERS: readonly Modifier[] = [
    { name: 'Mod', label: 'Ctrl', macLabel: '⌘', aria: 'Control', macAria: 'Meta' },
    { name: 'Alt', label: 'Alt', macLabel: '⌥', aria: 'Alt', macAria: 'Alt' },
    { name: 'Shift', label: 'Shift', macLabel: '⇧', aria: 'Shift', macAria: 'Shift' },
];
const MAC_LABEL_ORDER = ['Alt', 'Shift', 'Mod'];

/** A ProseMirror key binding (`Mod-Shift-z`) as people and assistive technology name it on this platform. */
export const describeShortcut = (shortcut: string, isMac: boolean = isMacOS()): ShortcutDescription => {
    const parts = shortcut.split(/-(?!$)/);
    const key = (parts.at(-1) ?? '').toUpperCase();
    const modifiers = MODIFIERS.filter(({ name }) => parts.slice(0, -1).includes(name));

    if (isMac) {
        const macModifiers = [...modifiers].sort(
            (first, second) => MAC_LABEL_ORDER.indexOf(first.name) - MAC_LABEL_ORDER.indexOf(second.name),
        );

        return {
            label: `${macModifiers.map(({ macLabel }) => macLabel).join('')}${key}`,
            ariaKeyShortcuts: [...modifiers.map(({ macAria }) => macAria), key].join('+'),
        };
    }

    return {
        label: [...modifiers.map(({ label }) => label), key].join('+'),
        ariaKeyShortcuts: [...modifiers.map(({ aria }) => aria), key].join('+'),
    };
};
