import type { ChainedCommands, Editor } from '@tiptap/core';

export type Command = (chain: ChainedCommands) => ChainedCommands;

export const runChain = (editor: Editor, command: Command): void => {
    command(editor.chain().focus()).run();
};

// An entry is enabled only where its command can run, e.g. not in a code block, which allows no text style.
export const canRun =
    (command: Command) =>
    (editor: Editor): boolean =>
        command(editor.can().chain()).run();
