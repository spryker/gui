import { sep } from 'node:path';
import type { Stats } from 'node:fs';
import glob from 'fast-glob';
import { watch } from 'chokidar';
import type { FSWatcher } from 'chokidar';
import type { TwigVersionHolder } from './manifest-writer.mts';

// One editor save can surface as `add` followed by `change`; the debounce folds them into one bump.
const DEFAULT_TWIG_DEBOUNCE_MILLISECONDS = 100;

// chokidar v4 has no glob support, so `**/Zed/**/Presentation/**/*.twig` is matched by hand.
const isPresentationTwigTemplate = (changedPath: string): boolean =>
    changedPath.endsWith('.twig') && changedPath.split(sep).includes('Presentation');

export interface DebouncedTwigBumpOptions {
    twigVersionHolder: TwigVersionHolder;
    rewriteManifest: () => void;
    debounceMilliseconds?: number;
}

export const createDebouncedTwigBump = ({
    twigVersionHolder,
    rewriteManifest,
    debounceMilliseconds = DEFAULT_TWIG_DEBOUNCE_MILLISECONDS,
}: DebouncedTwigBumpOptions): ((changedPath: string) => void) => {
    let debounceTimer: NodeJS.Timeout | undefined;

    const scheduleBump = (): void => {
        if (debounceTimer !== undefined) {
            clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
            debounceTimer = undefined;
            twigVersionHolder.value += 1;
            rewriteManifest();
        }, debounceMilliseconds);

        debounceTimer.unref();
    };

    return (changedPath: string): void => {
        if (!isPresentationTwigTemplate(changedPath)) {
            return;
        }

        scheduleBump();
    };
};

export interface TwigWatcherOptions {
    watchedDirectories: string[];
    twigVersionHolder: TwigVersionHolder;
    rewriteManifest: () => void;
    debounceMilliseconds?: number;
    createWatcher?: typeof watch;
}

// chokidar v4 opens a descriptor per subdirectory; watching whole module roots (~34k directories) hits EMFILE.
export const resolvePresentationWatchDirectories = async (sourceRootDirectories: string[]): Promise<string[]> => {
    const resolvedModuleDirectorySets = await Promise.all(
        sourceRootDirectories.map((directoryPattern) =>
            glob(directoryPattern, { onlyDirectories: true, absolute: true, unique: true }),
        ),
    );

    const presentationDirectorySets = await Promise.all(
        resolvedModuleDirectorySets.flat().map((moduleDirectory) =>
            glob('**/Presentation', {
                cwd: moduleDirectory,
                onlyDirectories: true,
                absolute: true,
                unique: true,
                ignore: ['**/node_modules/**'],
            }),
        ),
    );

    return Array.from(new Set(presentationDirectorySets.flat()));
};

const describeWatchedDirectories = (directories: string[]): string => {
    const maximumListedDirectories = 3;

    if (directories.length <= maximumListedDirectories) {
        return directories.join(', ');
    }

    const listedDirectories = directories.slice(0, maximumListedDirectories).join(', ');
    const remainingCount = directories.length - maximumListedDirectories;

    return `${listedDirectories} and ${remainingCount} more Presentation directories`;
};

export const createTwigWatcher = ({
    watchedDirectories,
    twigVersionHolder,
    rewriteManifest,
    debounceMilliseconds,
    createWatcher = watch,
}: TwigWatcherOptions): FSWatcher => {
    const watcher = createWatcher(watchedDirectories, {
        ignoreInitial: true,
        // Directories must never be ignored, or chokidar stops recursing into Presentation trees.
        ignored: (targetPath: string, stats?: Stats): boolean =>
            Boolean(stats?.isFile()) && !targetPath.endsWith('.twig'),
    });

    const handleTemplateEvent = createDebouncedTwigBump({ twigVersionHolder, rewriteManifest, debounceMilliseconds });

    watcher
        .on('add', handleTemplateEvent)
        .on('change', handleTemplateEvent)
        .on('unlink', handleTemplateEvent)
        .on('error', (error: unknown): void => {
            const reason = error instanceof Error ? error.message : String(error);

            console.error(
                `Back Office dev live-reload Twig watcher failed while watching ${describeWatchedDirectories(watchedDirectories)}. ` +
                    `Reason: ${reason}. ` +
                    `Check that these Presentation directories exist and are readable, then restart npm run zed:watch.`,
            );
        });

    return watcher;
};
