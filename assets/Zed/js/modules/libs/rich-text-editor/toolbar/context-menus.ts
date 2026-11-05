import { Extension, findParentNode } from '@tiptap/core';
import type { AnyExtension, ChainedCommands, Editor } from '@tiptap/core';
import { openLinkDialog } from '../dialogs/link-dialog';
import { canAddLink } from '../dialogs/link-placement';
import type { LabelKey, Labels } from '../labels';
import type { NodeMenuDefinition, ToolbarItemDefinition } from '../types';
import type { IconShape } from './icons';
import { createImageMenu, isNodeSelected } from './image-menu';
import { LINK_ITEM_ID, PICTURE_ITEM_ID, TABLE_ITEM_ID } from './insert-items';
import {
    ICON_COLUMN_AFTER,
    ICON_COLUMN_BEFORE,
    ICON_DELETE_COLUMN,
    ICON_DELETE_ROW,
    ICON_EDIT,
    ICON_HEADER_ROW,
    ICON_MERGE_CELLS,
    ICON_OPEN_EXTERNAL,
    ICON_ROW_AFTER,
    ICON_ROW_BEFORE,
    ICON_SPLIT_CELL,
    ICON_TRASH,
    ICON_UNLINK,
} from './menu-icons';
import { LINK_DIALOG_SHORTCUT } from './shortcuts';

// Only these open in a new tab: a relative or Twig address points at the storefront, not the Back Office.
const OPENABLE_ADDRESS = /^(?:https?:|mailto:|tel:|\/\/)/i;

type TableCommand = (chain: ChainedCommands) => ChainedCommands;

const readHref = (editor: Editor): string => {
    const href: unknown = editor.getAttributes('link').href;

    return typeof href === 'string' ? href : '';
};

// Tiptap's toggleHeaderRow is prosemirror-tables' toggleHeader('row'): it switches the table's first row, which
// counts as a header row only when every one of its cells is a header cell (a header column makes just one).
const hasHeaderRow = (editor: Editor): boolean => {
    const firstRow = findParentNode((node) => node.type.name === 'table')(editor.state.selection)?.node.firstChild;
    let isHeaderRow = (firstRow?.childCount ?? 0) > 0;

    firstRow?.forEach((cell) => {
        isHeaderRow &&= cell.type.name === 'tableHeader';
    });

    return isHeaderRow;
};

const createLinkMenu = (labels: Labels): NodeMenuDefinition => ({
    nodeName: 'link',
    label: labels.get('link'),
    showLabels: false,
    isShown: (editor) => editor.isActive('link') && !isNodeSelected(editor),
    caption: readHref,
    items: [
        {
            id: 'link-edit',
            label: labels.get('linkEdit'),
            iconShape: ICON_EDIT,
            kind: 'button',
            run: (editor) => openLinkDialog(editor, labels),
        },
        {
            id: 'link-open',
            label: labels.get('linkOpen'),
            iconShape: ICON_OPEN_EXTERNAL,
            kind: 'button',
            run: (editor) => window.open(readHref(editor), '_blank', 'noopener,noreferrer'),
            isEnabled: (editor) => OPENABLE_ADDRESS.test(readHref(editor)),
        },
        {
            id: 'link-remove',
            label: labels.get('linkRemove'),
            iconShape: ICON_UNLINK,
            kind: 'button',
            run: (editor) => editor.chain().focus().extendMarkRange('link').unsetLink().run(),
        },
    ],
});

const tableAction = (
    labels: Labels,
    id: string,
    labelKey: LabelKey,
    iconShape: IconShape,
    command: TableCommand,
): ToolbarItemDefinition => ({
    id: `table-${id}`,
    label: labels.get(labelKey),
    iconShape,
    kind: 'button',
    run: (editor) => command(editor.chain().focus()).run(),
    isEnabled: (editor) => command(editor.can().chain()).run(),
});

const createTableMenu = (labels: Labels): NodeMenuDefinition => ({
    nodeName: 'table',
    label: labels.get('table'),
    showLabels: false,
    // A link or a selected node in a cell has its own menu, at the same place.
    isShown: (editor) => editor.isActive('table') && !editor.isActive('link') && !isNodeSelected(editor),
    items: [
        tableAction(labels, 'add-row-before', 'addRowBefore', ICON_ROW_BEFORE, (chain) => chain.addRowBefore()),
        tableAction(labels, 'add-row-after', 'addRowAfter', ICON_ROW_AFTER, (chain) => chain.addRowAfter()),
        tableAction(labels, 'add-column-before', 'addColumnBefore', ICON_COLUMN_BEFORE, (chain) =>
            chain.addColumnBefore(),
        ),
        tableAction(labels, 'add-column-after', 'addColumnAfter', ICON_COLUMN_AFTER, (chain) => chain.addColumnAfter()),
        tableAction(labels, 'delete-row', 'deleteRow', ICON_DELETE_ROW, (chain) => chain.deleteRow()),
        tableAction(labels, 'delete-column', 'deleteColumn', ICON_DELETE_COLUMN, (chain) => chain.deleteColumn()),
        tableAction(labels, 'merge-cells', 'mergeCells', ICON_MERGE_CELLS, (chain) => chain.mergeCells()),
        tableAction(labels, 'split-cell', 'splitCell', ICON_SPLIT_CELL, (chain) => chain.splitCell()),
        {
            ...tableAction(labels, 'header-row', 'headerRow', ICON_HEADER_ROW, (chain) => chain.toggleHeaderRow()),
            kind: 'toggle',
            isActive: hasHeaderRow,
        },
        tableAction(labels, 'delete', 'deleteTable', ICON_TRASH, (chain) => chain.deleteTable()),
    ],
});

/**
 * The menus shown next to a link, a selected image and a table. Each extends its toolbar item, so a field whose
 * `toolbar` option leaves the item out gets no menu for it either.
 */
export const createContextMenus = (labels: Labels, hasItem: (itemId: string) => boolean): NodeMenuDefinition[] => [
    ...(hasItem(LINK_ITEM_ID) ? [createLinkMenu(labels)] : []),
    ...(hasItem(PICTURE_ITEM_ID) ? [createImageMenu(labels)] : []),
    ...(hasItem(TABLE_ITEM_ID) ? [createTableMenu(labels)] : []),
];

/** Mod-K opens the link dialog, as in most editors; only for a field with the link item, where a link can exist. */
export const createLinkDialogShortcut = (labels: Labels): AnyExtension =>
    Extension.create({
        name: 'linkDialogShortcut',

        addKeyboardShortcuts() {
            return {
                [LINK_DIALOG_SHORTCUT]: () => {
                    if (!this.editor.isEditable || !canAddLink(this.editor)) {
                        return false;
                    }

                    openLinkDialog(this.editor, labels);

                    return true;
                },
            };
        },
    });
