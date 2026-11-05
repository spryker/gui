import type { ChainedCommands, Editor } from '@tiptap/core';
import { setBlockType } from '@tiptap/pm/commands';
import type { Labels } from '../labels';
import type { ToolbarItemDefinition } from '../types';
import { ICON_HEADING } from './stroke-icons';
import type { ToolbarGroup } from './toolbar';

const STYLE_ITEM_ID = 'style';

// The block tag names, as values of the menu.
const NORMAL_TEXT = 'p';
const QUOTE = 'blockquote';
const CODE_BLOCK = 'pre';
const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

type HeadingLevel = (typeof HEADING_LEVELS)[number];

interface TextStyle {
    readonly value: string;
    readonly label: string;
    command(chain: ChainedCommands, editor: Editor): ChainedCommands;
    canApply(editor: Editor): boolean;
}

const headingValue = (level: HeadingLevel): string => `h${level}`;

const findCurrentStyle = (editor: Editor): string => {
    if (editor.isActive('codeBlock')) {
        return CODE_BLOCK;
    }

    const level = HEADING_LEVELS.find((headingLevel) => editor.isActive('heading', { level: headingLevel }));

    if (level !== undefined) {
        return headingValue(level);
    }

    return editor.isActive('blockquote') ? QUOTE : NORMAL_TEXT;
};

// Whether the block can change type in place. Tiptap's set* commands fall back to clearNodes when it cannot, which
// lifts the block out of its list or quote; such a change is not offered.
const canSetBlockType = (editor: Editor, nodeName: string, attributes?: Record<string, unknown>): boolean => {
    const type = editor.schema.nodes[nodeName];

    return type !== undefined && setBlockType(type, attributes)(editor.state);
};

const createTextStyles = (labels: Labels): TextStyle[] => [
    {
        value: NORMAL_TEXT,
        label: labels.get('normalText'),
        // A paragraph in a quote leaves the quote; a heading or code block becomes a paragraph where it is.
        command: (chain, editor) =>
            findCurrentStyle(editor) === QUOTE ? chain.lift('blockquote') : chain.setParagraph(),
        canApply: (editor) =>
            findCurrentStyle(editor) === QUOTE ? editor.can().lift('blockquote') : canSetBlockType(editor, 'paragraph'),
    },
    ...HEADING_LEVELS.map((level) => ({
        value: headingValue(level),
        label: labels.get(`heading${level}`),
        command: (chain: ChainedCommands) => chain.setHeading({ level }),
        canApply: (editor: Editor) => canSetBlockType(editor, 'heading', { level }),
    })),
    {
        value: QUOTE,
        label: labels.get('quote'),
        command: (chain) => chain.setBlockquote(),
        // Wrapping inside a quote nests a second one.
        canApply: (editor) => !editor.isActive('blockquote') && editor.can().setBlockquote(),
    },
    {
        value: CODE_BLOCK,
        label: labels.get('codeBlock'),
        command: (chain) => chain.setCodeBlock(),
        canApply: (editor) => canSetBlockType(editor, 'codeBlock'),
    },
];

/** The block type of the selection: normal text, headings, quote, code block. */
export const createBlockGroup = (labels: Labels): ToolbarGroup => {
    const styles = createTextStyles(labels);
    const item: ToolbarItemDefinition = {
        id: STYLE_ITEM_ID,
        label: labels.get('textStyle'),
        iconShape: ICON_HEADING,
        kind: 'menu',
        // The current style stays enabled, as a no-op; the others only where they change the block in place.
        menuItems: styles.map(({ value, label, canApply }) => ({
            value,
            label,
            isEnabled: (editor: Editor) => findCurrentStyle(editor) === value || canApply(editor),
        })),
        run: (editor, value) => {
            const style = styles.find((candidate) => candidate.value === value);

            if (style === undefined || findCurrentStyle(editor) === value) {
                editor.commands.focus();

                return;
            }

            style.command(editor.chain().focus(), editor).run();
        },
        activeValue: findCurrentStyle,
    };

    return { name: 'block', items: [item] };
};
