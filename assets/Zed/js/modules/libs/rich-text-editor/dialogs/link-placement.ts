import type { Editor } from '@tiptap/core';

export const LINK_MARK_NAME = 'link';

// Placement is checked with a valid address: whether the address itself is allowed is checked separately.
const PLACEMENT_PROBE_HREF = 'https://example.com';

/**
 * Whether a link can be set at the selection. A code block or inline code allows none; ProseMirror would drop the
 * mark from inserted text without failing, so the toolbar, Mod-K and the dialog check this before anything runs.
 */
export const canAddLink = (editor: Editor): boolean =>
    editor.can().setMark(LINK_MARK_NAME, { href: PLACEMENT_PROBE_HREF });
