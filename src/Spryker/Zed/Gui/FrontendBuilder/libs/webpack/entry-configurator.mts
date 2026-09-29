import type { EntryObject } from 'webpack';

// Every page loads the runtime entry; `dependOn` keeps jQuery and shared modules there, not duplicated per
// entry, and guarantees the webpack runtime that `import()` needs is present everywhere.
export const configureEntryPoints = (entryPoints: Record<string, string>, runtimeEntryName: string): EntryObject => {
    const runtimeEntry: EntryObject = {};
    const dependentEntries: EntryObject = {};

    for (const [entryName, importPath] of Object.entries(entryPoints)) {
        if (entryName === runtimeEntryName) {
            runtimeEntry[entryName] = { runtime: false, import: importPath };

            continue;
        }

        dependentEntries[entryName] = { dependOn: runtimeEntryName, import: importPath };
    }

    if (Object.keys(runtimeEntry).length === 0) {
        throw new Error(
            `The shared runtime entry "${runtimeEntryName}" was not found among the discovered entry ` +
                `points. Every other entry declares "dependOn" on it, so webpack would fail with an ` +
                `unresolved dependOn target. Check that the Gui module ships ` +
                `assets/Zed/js/${runtimeEntryName}.entry.js and that the core source root in the builder ` +
                `settings points at the directory that contains it.`,
        );
    }

    return { ...runtimeEntry, ...dependentEntries };
};
