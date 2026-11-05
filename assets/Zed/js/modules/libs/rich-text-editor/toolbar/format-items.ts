import type { Labels } from '../labels';
import type { ToolbarItemDefinition } from '../types';
import { canRun, runChain } from './chain';
import type { Command } from './chain';
import { createColorMenu, readTextStyle } from './color-menu';
import type { IconShape } from './icons';
import { ICON_CLEAR_FORMATTING, ICON_FONT_SIZE, ICON_TEXT_COLOR } from './stroke-icons';
import {
    ICON_BOLD,
    ICON_HIGHLIGHTER,
    ICON_ITALIC,
    ICON_STRIKE,
    ICON_SUBSCRIPT,
    ICON_SUPERSCRIPT,
    ICON_UNDERLINE,
} from './tiptap-format-icons';
import { ICON_BULLET_LIST, ICON_ORDERED_LIST } from './tiptap-insert-icons';
import { createParagraphMenu } from './paragraph-menu';
import { FONT_SIZES_PX } from './palette';
import type { ToolbarGroup } from './toolbar';

const activeToggle = (
    id: string,
    label: string,
    iconShape: IconShape,
    activeName: string,
    command: Command,
    shortcut?: string,
): ToolbarItemDefinition => ({
    id,
    label,
    iconShape,
    kind: 'toggle',
    shortcut,
    run: (editor) => runChain(editor, command),
    isActive: (editor) => editor.isActive(activeName),
});

/** Summernote's `style`, `font`, `fontsize`, `color` and `para` groups (ZedGuiEditorConfiguration.getConfig()). */
export const createFormatGroups = (labels: Labels): ToolbarGroup[] => [
    {
        name: 'style',
        items: [
            activeToggle('bold', labels.get('bold'), ICON_BOLD, 'bold', (chain) => chain.toggleBold(), 'Mod-b'),
            activeToggle(
                'italic',
                labels.get('italic'),
                ICON_ITALIC,
                'italic',
                (chain) => chain.toggleItalic(),
                'Mod-i',
            ),
            activeToggle(
                'underline',
                labels.get('underline'),
                ICON_UNDERLINE,
                'underline',
                (chain) => chain.toggleUnderline(),
                'Mod-u',
            ),
            {
                id: 'clear',
                label: labels.get('clearFormatting'),
                iconShape: ICON_CLEAR_FORMATTING,
                kind: 'button',
                run: (editor) => runChain(editor, (chain) => chain.unsetAllMarks()),
            },
        ],
    },
    {
        name: 'font',
        items: [
            activeToggle(
                'strikethrough',
                labels.get('strikethrough'),
                ICON_STRIKE,
                'strike',
                (chain) => chain.toggleStrike(),
                'Mod-Shift-s',
            ),
            activeToggle(
                'superscript',
                labels.get('superscript'),
                ICON_SUPERSCRIPT,
                'superscript',
                (chain) => chain.toggleSuperscript(),
                'Mod-.',
            ),
            activeToggle(
                'subscript',
                labels.get('subscript'),
                ICON_SUBSCRIPT,
                'subscript',
                (chain) => chain.toggleSubscript(),
                'Mod-,',
            ),
        ],
    },
    {
        name: 'fontsize',
        items: [
            {
                id: 'fontsize',
                label: labels.get('fontSize'),
                iconShape: ICON_FONT_SIZE,
                kind: 'menu',
                menuItems: [
                    { value: '', label: labels.get('defaultFontSize') },
                    ...FONT_SIZES_PX.map((size) => ({ value: size, label: size })),
                ].map((entry) => ({ ...entry, isEnabled: canRun((chain) => chain.unsetFontSize()) })),
                run: (editor, value) =>
                    runChain(editor, (chain) => (value ? chain.setFontSize(`${value}px`) : chain.unsetFontSize())),
                activeValue: (editor) => {
                    const fontSize = readTextStyle(editor, 'fontSize');

                    return fontSize === '' ? '' : (/^(\d+)px$/.exec(fontSize)?.[1] ?? null);
                },
            },
        ],
    },
    {
        name: 'color',
        items: [
            createColorMenu({
                id: 'color',
                label: labels.get('textColor'),
                resetLabel: labels.get('resetColor'),
                labels,
                iconShape: ICON_TEXT_COLOR,
                attribute: 'color',
                set: (chain, color) => chain.setColor(color),
                unset: (chain) => chain.unsetColor(),
            }),
            createColorMenu({
                id: 'background-color',
                label: labels.get('backgroundColor'),
                resetLabel: labels.get('resetColor'),
                labels,
                iconShape: ICON_HIGHLIGHTER,
                attribute: 'backgroundColor',
                set: (chain, color) => chain.setBackgroundColor(color),
                unset: (chain) => chain.unsetBackgroundColor(),
            }),
        ],
    },
    {
        name: 'para',
        items: [
            activeToggle(
                'ul',
                labels.get('bulletList'),
                ICON_BULLET_LIST,
                'bulletList',
                (chain) => chain.toggleBulletList(),
                'Mod-Shift-8',
            ),
            activeToggle(
                'ol',
                labels.get('orderedList'),
                ICON_ORDERED_LIST,
                'orderedList',
                (chain) => chain.toggleOrderedList(),
                'Mod-Shift-7',
            ),
            createParagraphMenu(labels),
        ],
    },
];
