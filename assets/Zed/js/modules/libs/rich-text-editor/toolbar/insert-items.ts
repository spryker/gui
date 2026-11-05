import type { ChainedCommands, Editor } from '@tiptap/core';
import { openImageDialog } from '../dialogs/image-dialog';
import { openLinkDialog } from '../dialogs/link-dialog';
import { canAddLink } from '../dialogs/link-placement';
import { openVideoDialog } from '../dialogs/video-dialog';
import type { Fullscreen } from '../fullscreen';
import type { Labels } from '../labels';
import type { RichTextEditorHandle } from '../types';
import { ICON_FULLSCREEN, ICON_HORIZONTAL_RULE, ICON_TABLE, ICON_VIDEO } from './stroke-icons';
import { LINK_DIALOG_SHORTCUT } from './shortcuts';
import { ICON_CODE, ICON_IMAGE_PLUS, ICON_LINK, ICON_REDO, ICON_UNDO } from './tiptap-insert-icons';
import type { ToolbarGroup } from './toolbar';

export const SOURCE_ITEM_ID = 'codeview';
export const FULLSCREEN_ITEM_ID = 'fullscreen';
export const PICTURE_ITEM_ID = 'picture';
export const LINK_ITEM_ID = 'link';
export const TABLE_ITEM_ID = 'table';

const TABLE_SIZES = [2, 3, 4, 5] as const;

const tableCommands = (
    labels: Labels,
): ReadonlyMap<string, { label: string; command(chain: ChainedCommands): ChainedCommands }> =>
    new Map([
        ...TABLE_SIZES.map(
            (size) =>
                [
                    `insert-${size}`,
                    {
                        label: `${labels.get('insertTable')} ${size} × ${size}`,
                        command: (chain: ChainedCommands) =>
                            chain.insertTable({ rows: size, cols: size, withHeaderRow: false }),
                    },
                ] as const,
        ),
        ['add-row', { label: labels.get('addRowAfter'), command: (chain: ChainedCommands) => chain.addRowAfter() }],
        [
            'add-column',
            { label: labels.get('addColumnAfter'), command: (chain: ChainedCommands) => chain.addColumnAfter() },
        ],
        ['delete-row', { label: labels.get('deleteRow'), command: (chain: ChainedCommands) => chain.deleteRow() }],
        [
            'delete-column',
            { label: labels.get('deleteColumn'), command: (chain: ChainedCommands) => chain.deleteColumn() },
        ],
        [
            'delete-table',
            { label: labels.get('deleteTable'), command: (chain: ChainedCommands) => chain.deleteTable() },
        ],
    ]);

/** Summernote's `insert` and `misc` groups (ZedGuiEditorConfiguration.getConfig()), plus full screen before the source toggle. */
export const createInsertGroups = (
    labels: Labels,
    handle: RichTextEditorHandle,
    fullscreen: Fullscreen,
): ToolbarGroup[] => {
    const tables = tableCommands(labels);

    return [
        {
            name: 'insert',
            items: [
                {
                    id: PICTURE_ITEM_ID,
                    label: labels.get('image'),
                    iconShape: ICON_IMAGE_PLUS,
                    kind: 'button',
                    run: (editor: Editor) => openImageDialog(editor, labels),
                },
                {
                    id: LINK_ITEM_ID,
                    label: labels.get('link'),
                    iconShape: ICON_LINK,
                    shortcut: LINK_DIALOG_SHORTCUT,
                    kind: 'toggle',
                    run: (editor: Editor) => openLinkDialog(editor, labels),
                    isActive: (editor: Editor) => editor.isActive('link'),
                    isEnabled: canAddLink,
                },
                {
                    id: 'video',
                    label: labels.get('video'),
                    iconShape: ICON_VIDEO,
                    kind: 'button',
                    run: (editor: Editor) => openVideoDialog(editor, labels),
                },
                {
                    id: TABLE_ITEM_ID,
                    label: labels.get('table'),
                    iconShape: ICON_TABLE,
                    kind: 'menu',
                    // Rows, columns and the table itself can only change with the cursor in a table.
                    menuItems: [...tables].map(([value, { label, command }]) => ({
                        value,
                        label,
                        isEnabled: (editor: Editor) => command(editor.can().chain()).run(),
                    })),
                    run: (editor: Editor, value?: string) => {
                        const entry = tables.get(value ?? '');

                        if (entry !== undefined) {
                            entry.command(editor.chain().focus()).run();
                        }
                    },
                },
                {
                    id: 'hr',
                    label: labels.get('horizontalRule'),
                    iconShape: ICON_HORIZONTAL_RULE,
                    kind: 'button',
                    run: (editor: Editor) => editor.chain().focus().setHorizontalRule().run(),
                },
            ],
        },
        {
            name: 'misc',
            items: [
                {
                    id: 'undo',
                    label: labels.get('undo'),
                    iconShape: ICON_UNDO,
                    shortcut: 'Mod-z',
                    kind: 'button',
                    run: (editor: Editor) => editor.chain().focus().undo().run(),
                    isEnabled: (editor: Editor) => editor.can().undo(),
                },
                {
                    id: 'redo',
                    label: labels.get('redo'),
                    iconShape: ICON_REDO,
                    shortcut: 'Mod-Shift-z',
                    kind: 'button',
                    run: (editor: Editor) => editor.chain().focus().redo().run(),
                    isEnabled: (editor: Editor) => editor.can().redo(),
                },
                {
                    id: FULLSCREEN_ITEM_ID,
                    label: labels.get('fullscreen'),
                    iconShape: ICON_FULLSCREEN,
                    kind: 'toggle',
                    run: () => fullscreen.toggle(),
                    isActive: () => fullscreen.isActive(),
                },
                {
                    id: SOURCE_ITEM_ID,
                    label: labels.get('source'),
                    iconShape: ICON_CODE,
                    kind: 'toggle',
                    run: () => void handle.setSourceMode(!handle.isSourceMode()),
                    isActive: () => handle.isSourceMode(),
                },
            ],
        },
    ];
};
