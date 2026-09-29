import { basename } from 'node:path';
import glob from 'fast-glob';

export interface FindSettings {
    dirs: string[];
    patterns: string[];
    globSettings?: Record<string, unknown>;
}

const defaultGlobSettings = {
    followSymbolicLinks: false,
    absolute: true,
    onlyFiles: true,
    unique: true,
};

const LEGACY_ENTRY_SUFFIX = /\.entry\.(js|ts)$/;

// Not `basename(filePath, '.entry.js')`: its suffix is literal, so a `.entry.ts` file would keep its name.
export const deriveEntryName = (filePath: string): string => {
    const fileName = basename(filePath);
    const entryName = fileName.replace(LEGACY_ENTRY_SUFFIX, '');

    if (entryName === fileName) {
        throw new Error(
            `Cannot derive an entry name from ${filePath}: the file name does not end in ".entry.js" ` +
                `or ".entry.ts". Entry discovery and name derivation disagree, which would emit an asset ` +
                `under a wrong name. Rename the file to "<output-name>.entry.js", or exclude it from the ` +
                `entry patterns in the builder settings.`,
        );
    }

    return entryName;
};

const globAsync = async (patterns: string[], globConfiguration: Record<string, unknown>): Promise<string[]> => {
    try {
        const files = await glob(patterns, globConfiguration);

        // fast-glob returns readdir order, which differs across machines; sorting keeps the bundle deterministic.
        return files.sort();
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);

        throw new Error(
            `Failed to search for Back Office assets in ${String(globConfiguration.cwd)} using patterns ` +
                `[${patterns.join(', ')}]: ${reason}. The build cannot continue without a complete entry ` +
                `list. Check that the directory is readable and that the patterns in the builder settings ` +
                `are valid.`,
        );
    }
};

const expandSourceDirectories = async (sourceDirectoryList: string[]): Promise<string[]> => {
    const expandedGroups = await Promise.all(
        sourceDirectoryList.map(async (sourceDirectory) => {
            const directories = await glob(sourceDirectory, {
                onlyDirectories: true,
                absolute: true,
                unique: true,
                followSymbolicLinks: false,
            });

            return directories.sort();
        }),
    );

    // Concatenation keeps the authored root order — the precedence rule the caller relies on.
    return ([] as string[]).concat(...expandedGroups);
};

export const findFiles = async (settings: FindSettings): Promise<string[]> => {
    const expandedDirectoryList = await expandSourceDirectories(settings.dirs);
    const collected: string[] = [];

    for (const directory of expandedDirectoryList) {
        const files = await globAsync(settings.patterns, {
            ...defaultGlobSettings,
            ...settings.globSettings,
            cwd: directory,
        });

        collected.push(...files);
    }

    return collected;
};

// A later source root replaces an earlier one, so a project entry overrides a same-named core entry.
export const findEntryPoints = async (settings: FindSettings): Promise<Record<string, string>> => {
    const files = await findFiles(settings);
    const entryPoints: Record<string, string> = {};

    for (const filePath of files) {
        entryPoints[deriveEntryName(filePath)] = filePath;
    }

    return entryPoints;
};

export const findResolveModuleDirectories = async (settings: FindSettings): Promise<string[]> => findFiles(settings);
