import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import webpack from 'webpack';
import type {
    Compiler,
    Configuration as WebpackConfiguration,
    EntryObject,
    Stats,
    WebpackPluginInstance,
} from 'webpack';
import type { FSWatcher } from 'chokidar';
import getDevelopmentConfiguration from './development.mts';
import {
    MANIFEST_FILENAME,
    createManifestWriterPlugin,
    createTwigVersionHolder,
} from '../libs/reload/manifest-writer.mts';
import { createTwigWatcher, resolvePresentationWatchDirectories } from '../libs/reload/twig-watcher.mts';
import type { TwigVersionHolder } from '../libs/reload/manifest-writer.mts';
import type { AppSettings } from '../settings.mts';

// Polling is opt-in for containers whose mounts do not forward inotify events; native watching is far cheaper.
const resolveWatchOptions = (): WebpackConfiguration['watchOptions'] => {
    const pollInterval = Number.parseInt(process.env.SPRYKER_FRONTEND_WATCH_POLL ?? '', 10);

    return {
        aggregateTimeout: 300,
        ignored: /node_modules/,
        ...(Number.isFinite(pollInterval) && pollInterval > 0 ? { poll: pollInterval } : {}),
    };
};

interface TwigWatcherStartOptions {
    watchedDirectories: string[];
    twigVersionHolder: TwigVersionHolder;
    rewriteManifest: () => void;
}

const createTwigWatcherStartPlugin = ({
    watchedDirectories,
    twigVersionHolder,
    rewriteManifest,
}: TwigWatcherStartOptions): WebpackPluginInstance => {
    let watcher: FSWatcher | undefined;

    return {
        apply(compiler: Compiler): void {
            compiler.hooks.done.tap('BackOfficeDevReloadTwigWatcherStart', (stats: Stats): void => {
                if (watcher !== undefined || stats.hasErrors()) {
                    return;
                }

                watcher = createTwigWatcher({ watchedDirectories, twigVersionHolder, rewriteManifest });

                console.log(
                    `Watching ${watchedDirectories.length} Presentation directories for Twig changes. ` +
                        `If a template edit reloads the page but the markup does not change, the Zed Twig ` +
                        `cache is stale: run "docker/sdk console twig:cache:warmer".`,
                );

                const closeWatcher = (): void => {
                    void watcher?.close();
                };

                process.once('SIGINT', closeWatcher);
                process.once('SIGTERM', closeWatcher);
                process.once('exit', closeWatcher);
            });
        },
    };
};

const configurationWatchMode = async (appSettings: AppSettings): Promise<WebpackConfiguration> => {
    const baseConfiguration = await getDevelopmentConfiguration(appSettings);
    const outputDirectory = join(appSettings.context, appSettings.paths.publicDir);

    // Kill switch shared with the Yves builder, deliberately an environment variable rather than a settings key.
    if (process.env.SPRYKER_FRONTEND_RELOAD === '0') {
        return { ...baseConfiguration, watch: true, watchOptions: resolveWatchOptions() };
    }

    const twigVersionHolder = createTwigVersionHolder();
    const { plugin: manifestWriterPlugin, rewriteManifest } = createManifestWriterPlugin({
        outputDirectory,
        twigVersionHolder,
    });

    const watchedDirectories = await resolvePresentationWatchDirectories(
        Object.values(appSettings.paths.sources).map((sourceRoot) => join(appSettings.context, sourceRoot)),
    );

    const reloadClientPath = fileURLToPath(new URL('../libs/reload/client/reload-client.ts', import.meta.url));
    const baseEntry = baseConfiguration.entry as EntryObject;
    const runtimeEntry = baseEntry[appSettings.runtimeEntryName] as { import: string | string[] };
    const runtimeImports = Array.isArray(runtimeEntry.import) ? runtimeEntry.import : [runtimeEntry.import];

    return {
        ...baseConfiguration,
        watch: true,
        watchOptions: resolveWatchOptions(),

        entry: {
            ...baseEntry,
            // Every Back Office page, the iframe layout included, loads this entry; no template references the client.
            [appSettings.runtimeEntryName]: {
                ...runtimeEntry,
                import: [reloadClientPath, ...runtimeImports],
            },
        },

        plugins: [
            ...(baseConfiguration.plugins ?? []),
            new webpack.DefinePlugin({
                // Root-relative, so it assumes the default assets base URL; a repointed one gets no live reload.
                __RELOAD_MANIFEST_URL__: JSON.stringify(`/assets/${MANIFEST_FILENAME}`),
            }),
            manifestWriterPlugin,
            createTwigWatcherStartPlugin({ watchedDirectories, twigVersionHolder, rewriteManifest }),
        ],
    };
};

export default configurationWatchMode;
