import type { Labels } from '../labels';
import type { ToolbarItemDefinition } from '../types';
import { canRun, runChain } from './chain';
import type { Command } from './chain';
import { ICON_ALIGN_LEFT } from './tiptap-insert-icons';

const ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const;
const DEFAULT_ALIGNMENT = 'left';

const PARAGRAPH_COMMANDS: Readonly<Record<string, Command>> = {
    left: (chain) => chain.setTextAlign('left'),
    center: (chain) => chain.setTextAlign('center'),
    right: (chain) => chain.setTextAlign('right'),
    justify: (chain) => chain.setTextAlign('justify'),
    outdent: (chain) => chain.outdent(),
    indent: (chain) => chain.indent(),
};
const NO_COMMAND: Command = (chain) => chain;

/** Summernote's `paragraph` menu: the alignment of the selection (checked) and indent/outdent commands. */
export const createParagraphMenu = (labels: Labels): ToolbarItemDefinition => ({
    id: 'paragraph',
    label: labels.get('paragraph'),
    iconShape: ICON_ALIGN_LEFT,
    kind: 'menu',
    menuItems: [
        { value: 'left', label: labels.get('alignLeft') },
        { value: 'center', label: labels.get('alignCenter') },
        { value: 'right', label: labels.get('alignRight') },
        { value: 'justify', label: labels.get('alignJustify') },
        { value: 'outdent', label: labels.get('outdent'), isAction: true },
        { value: 'indent', label: labels.get('indent'), isAction: true },
    ].map((entry) => ({ ...entry, isEnabled: canRun(PARAGRAPH_COMMANDS[entry.value] ?? NO_COMMAND) })),
    run: (editor, value) => {
        const command = PARAGRAPH_COMMANDS[value ?? ''];

        if (command !== undefined) {
            runChain(editor, command);
        }
    },
    // No alignment is current where none applies, e.g. in a code block.
    activeValue: (editor) =>
        editor.can().setTextAlign(DEFAULT_ALIGNMENT)
            ? (ALIGNMENTS.find((alignment) => editor.isActive({ textAlign: alignment })) ?? DEFAULT_ALIGNMENT)
            : null,
});
