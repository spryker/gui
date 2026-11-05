import { Extension } from '@tiptap/core';
import type { CommandProps } from '@tiptap/core';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        indent: {
            /** Indents list items one level, other blocks by one step of left margin. */
            indent: () => ReturnType;
            /** Outdents list items one level, other blocks by one step of left margin, down to none. */
            outdent: () => ReturnType;
        };
    }
}

// Summernote's paragraph indent (Paragraph.indent in summernote-bs5.js) writes margin-left in 25px steps.
const INDENT_STEP_PX = 25;
const LIST_ITEM = 'listItem';

const parseMarginLeft = (element: HTMLElement): number =>
    Math.max(0, Number.parseInt(element.style.marginLeft, 10) || 0);

const shiftMarginLeft =
    (types: readonly string[], delta: number) =>
    ({ tr, state }: CommandProps): boolean => {
        let isChanged = false;

        state.doc.nodesBetween(state.selection.from, state.selection.to, (node, position) => {
            if (!types.includes(node.type.name)) {
                return true;
            }

            const marginLeft = Math.max(0, (Number(node.attrs.marginLeft) || 0) + delta);

            if (marginLeft !== node.attrs.marginLeft) {
                tr.setNodeMarkup(position, undefined, { ...node.attrs, marginLeft });
                isChanged = true;
            }

            return false;
        });

        return isChanged;
    };

export const Indent = Extension.create<{ types: string[] }>({
    name: 'indent',

    addOptions() {
        return { types: ['paragraph', 'heading'] };
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    marginLeft: {
                        default: 0,
                        parseHTML: parseMarginLeft,
                        renderHTML: (attributes: { marginLeft?: number }) =>
                            (attributes.marginLeft ?? 0) > 0
                                ? { style: `margin-left: ${attributes.marginLeft}px` }
                                : {},
                    },
                },
            },
        ];
    },

    addCommands() {
        return {
            indent:
                () =>
                (props: CommandProps): boolean =>
                    props.editor.isActive(LIST_ITEM)
                        ? props.commands.sinkListItem(LIST_ITEM)
                        : shiftMarginLeft(this.options.types, INDENT_STEP_PX)(props),
            outdent:
                () =>
                (props: CommandProps): boolean =>
                    props.editor.isActive(LIST_ITEM)
                        ? props.commands.liftListItem(LIST_ITEM)
                        : shiftMarginLeft(this.options.types, -INDENT_STEP_PX)(props),
        };
    },
});
