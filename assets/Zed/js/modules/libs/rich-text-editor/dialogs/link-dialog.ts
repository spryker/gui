import { getMarkRange } from '@tiptap/core';
import type { Editor, Range } from '@tiptap/core';
import { isAllowedUri } from '@tiptap/extension-link';
import type { Labels } from '../labels';
import { LINK_MARK_NAME, canAddLink } from './link-placement';
import { openDialog } from './modal';
import type { DialogField } from './modal';

export interface LinkValues {
    readonly href: string;
    readonly text: string;
    readonly newTab: boolean;
}

const NEW_TAB_ATTRIBUTES = { target: '_blank', rel: 'noopener noreferrer' };
const SAME_TAB_ATTRIBUTES = { target: null, rel: null };
// The dialog's text can only stand for plain text in one block: replacing more would drop images or merge blocks.
const isPlainTextRange = (editor: Editor, { from, to }: Range): boolean => {
    const { doc } = editor.state;
    const $from = doc.resolve(from);
    let isPlainText = $from.parent.isTextblock && $from.sameParent(doc.resolve(to));

    doc.nodesBetween(from, to, (node) => {
        isPlainText &&= !node.isInline || node.isText;
    });

    return isPlainText;
};

/** The text the dialog links: the selection, or the whole link the cursor is in; empty at a bare cursor. */
const findLinkedRange = (editor: Editor): Range => {
    const { selection, schema } = editor.state;

    if (selection.empty && editor.isActive(LINK_MARK_NAME)) {
        return getMarkRange(selection.$from, schema.marks[LINK_MARK_NAME]) ?? selection;
    }

    return selection;
};

/**
 * Links the selection (or the link under the cursor); without a selection, inserts the text as a new link.
 * A changed text replaces linked plain text in one block, keeping the marks of its first character; for any other
 * selection (an image, several blocks) the text is ignored. Returns false for an empty or disallowed address
 * (javascript: and other non-web schemes) and where no link can exist (canAddLink).
 */
export const applyLink = (editor: Editor, values: LinkValues): boolean => {
    const href = values.href.trim();

    if (href === '' || !isAllowedUri(href) || !canAddLink(editor)) {
        return false;
    }

    const attributes = { href, ...(values.newTab ? NEW_TAB_ATTRIBUTES : SAME_TAB_ATTRIBUTES) };
    const text = values.text.trim();
    const range = findLinkedRange(editor);
    const { from, to } = range;

    if (from === to) {
        return editor
            .chain()
            .focus()
            .insertContent({ type: 'text', text: text || href, marks: [{ type: LINK_MARK_NAME, attrs: attributes }] })
            .run();
    }

    if (text !== '' && isPlainTextRange(editor, range) && text !== editor.state.doc.textBetween(from, to).trim()) {
        const marks = (editor.state.doc.nodeAt(from)?.marks ?? [])
            .filter((mark) => mark.type.name !== LINK_MARK_NAME)
            .map((mark) => mark.toJSON() as { type: string; attrs?: Record<string, unknown> });

        return editor
            .chain()
            .focus()
            .insertContentAt(
                { from, to },
                { type: 'text', text, marks: [...marks, { type: LINK_MARK_NAME, attrs: attributes }] },
            )
            .run();
    }

    return editor.chain().focus().extendMarkRange(LINK_MARK_NAME).setLink(attributes).run();
};

export const openLinkDialog = (editor: Editor, labels: Labels): void => {
    const current = editor.getAttributes(LINK_MARK_NAME) as { href?: string; target?: string | null };
    const range = findLinkedRange(editor);
    const isEditing = typeof current.href === 'string';
    // The selected or linked text; changing it replaces that text. Not offered for an image or several blocks.
    const textField: DialogField[] = isPlainTextRange(editor, range)
        ? [
              {
                  name: 'text',
                  label: labels.get('linkText'),
                  type: 'text',
                  value: editor.state.doc.textBetween(range.from, range.to),
              },
          ]
        : [];

    openDialog({
        title: labels.get('linkDialogTitle'),
        fields: [
            { name: 'href', label: labels.get('linkUrl'), type: 'url', value: current.href ?? '' },
            ...textField,
            { name: 'newTab', label: labels.get('linkNewTab'), type: 'checkbox', checked: current.target === '_blank' },
        ],
        submitLabel: labels.get('dialogInsert'),
        cancelLabel: labels.get('dialogCancel'),
        closeLabel: labels.get('dialogClose'),
        secondaryAction: isEditing
            ? {
                  label: labels.get('linkRemove'),
                  run: () => editor.chain().focus().extendMarkRange(LINK_MARK_NAME).unsetLink().run(),
              }
            : undefined,
        onSubmit: (values) => {
            if (!canAddLink(editor)) {
                return labels.get('linkNotAllowed');
            }

            const isApplied = applyLink(editor, {
                href: String(values.href ?? ''),
                text: String(values.text ?? ''),
                newTab: values.newTab === true,
            });

            return isApplied ? null : labels.get('linkInvalid');
        },
        onClose: () => editor.commands.focus(),
    });
};
