import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// Never commit fixtures: the oryx build globs every `*.entry.js` under `Zed/` and cannot exclude this directory.
const createdRoots: string[] = [];

export const createModuleTree = (files: Record<string, string>): string => {
    const root = mkdtempSync(join(tmpdir(), 'zed-builder-tree-'));
    createdRoots.push(root);

    for (const [relativePath, contents] of Object.entries(files)) {
        const filePath = join(root, relativePath);
        mkdirSync(dirname(filePath), { recursive: true });
        writeFileSync(filePath, contents);
    }

    return root;
};

export const removeCreatedModuleTrees = (): void => {
    while (createdRoots.length > 0) {
        rmSync(createdRoots.pop()!, { recursive: true, force: true });
    }
};
