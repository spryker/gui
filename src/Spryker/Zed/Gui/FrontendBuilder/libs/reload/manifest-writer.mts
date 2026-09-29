import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Compiler, Stats, WebpackPluginInstance } from 'webpack';

export const MANIFEST_FILENAME = 'dev-build-manifest.json';

// Scoping the hash walk to webpack's own subdirectories is what excludes copied static assets.
const emittedAssetSubdirectories = ['js', 'css'] as const;

export interface TwigVersionHolder {
    value: number;
}

export const createTwigVersionHolder = (): TwigVersionHolder => ({ value: 0 });

export interface AssetHashMap {
    [relativeAssetPath: string]: string;
}

export interface DevBuildManifest {
    buildId: number;
    twigVersion: number;
    assets: AssetHashMap;
}

export interface ManifestWriterPluginOptions {
    outputDirectory: string;
    twigVersionHolder: TwigVersionHolder;
}

// `rewriteManifest` does not advance `buildId`, so a Twig edit reloads without faking a webpack build.
export interface ManifestWriter {
    plugin: WebpackPluginInstance;
    rewriteManifest: () => void;
}

const collectFilesRecursively = (directory: string): string[] => {
    const collected: string[] = [];

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const entryPath = join(directory, entry.name);

        if (entry.isDirectory()) {
            collected.push(...collectFilesRecursively(entryPath));

            continue;
        }

        collected.push(entryPath);
    }

    return collected;
};

const isHashableAssetFile = (filePath: string): boolean => {
    if (filePath.endsWith('.map')) {
        return false;
    }

    return filePath.endsWith('.js') || filePath.endsWith('.css');
};

const toRelativePosixPath = (outputDirectory: string, filePath: string): string =>
    relative(outputDirectory, filePath).split(sep).join('/');

export const hashEmittedAssets = (outputDirectory: string): AssetHashMap => {
    const assetHashes: AssetHashMap = {};

    for (const subdirectory of emittedAssetSubdirectories) {
        const subdirectoryPath = join(outputDirectory, subdirectory);

        if (!existsSync(subdirectoryPath)) {
            continue;
        }

        const sortedFiles = collectFilesRecursively(subdirectoryPath).sort();

        for (const filePath of sortedFiles) {
            if (!isHashableAssetFile(filePath)) {
                continue;
            }

            const hash = createHash('sha256').update(readFileSync(filePath)).digest('hex');
            assetHashes[toRelativePosixPath(outputDirectory, filePath)] = hash;
        }
    }

    return assetHashes;
};

let temporaryFileCounter = 0;

// Temp file plus rename, so a polling client never reads a half-written manifest.
export const writeDevBuildManifest = (outputDirectory: string, manifest: DevBuildManifest): void => {
    const manifestPath = join(outputDirectory, MANIFEST_FILENAME);
    temporaryFileCounter += 1;
    const temporaryPath = join(outputDirectory, `${MANIFEST_FILENAME}.${process.pid}.${temporaryFileCounter}.tmp`);
    const serializedManifest = `${JSON.stringify(manifest, null, 2)}\n`;

    try {
        writeFileSync(temporaryPath, serializedManifest);
        renameSync(temporaryPath, manifestPath);
    } catch (error) {
        if (existsSync(temporaryPath)) {
            rmSync(temporaryPath, { force: true });
        }

        const reason = error instanceof Error ? error.message : String(error);

        throw new Error(
            `Failed to write the Back Office dev live-reload manifest to ${manifestPath}. ` +
                `Reason: ${reason}. ` +
                `Ensure the webpack output directory exists and is writable, then re-run npm run zed:watch.`,
        );
    }
};

export const createManifestWriterPlugin = ({
    outputDirectory,
    twigVersionHolder,
}: ManifestWriterPluginOptions): ManifestWriter => {
    let buildId = 0;

    const writeManifestOrReport = (): void => {
        const manifest: DevBuildManifest = {
            buildId,
            twigVersion: twigVersionHolder.value,
            assets: hashEmittedAssets(outputDirectory),
        };

        try {
            writeDevBuildManifest(outputDirectory, manifest);
        } catch (error) {
            console.error(error instanceof Error ? error.message : String(error));
        }
    };

    return {
        plugin: {
            apply(compiler: Compiler): void {
                compiler.hooks.done.tap('BackOfficeDevReloadManifestWriter', (stats: Stats): void => {
                    if (stats.hasErrors()) {
                        return;
                    }

                    buildId += 1;
                    writeManifestOrReport();
                });
            },
        },
        rewriteManifest: writeManifestOrReport,
    };
};
