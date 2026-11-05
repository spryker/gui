import { Extension, Mark, Node, mergeAttributes, nodePasteRule, textblockTypeInputRule } from '@tiptap/core';
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import type { TiptapApi } from './types';

/** The one Tiptap/ProseMirror copy of the page: features receive it instead of importing their own. */
export const tiptapApi: TiptapApi = {
    Node,
    Mark,
    Extension,
    mergeAttributes,
    nodePasteRule,
    textblockTypeInputRule,
    Plugin,
    PluginKey,
    NodeSelection,
};
