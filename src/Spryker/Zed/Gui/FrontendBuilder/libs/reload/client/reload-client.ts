// Browser bundle code, not builder code (no `node:` imports, no `.mts`); only development-watch injects it.
// Extensionless specifier: the Back Office tsconfig has allowImportingTsExtensions off.
import { reloadPreservingState, restorePreservedState } from './reload-state';

// Redeclared, not imported: manifest-writer is builder-only code that must never enter the bundle.
interface DevBuildManifest {
    buildId: number;
    twigVersion: number;
    assets: Record<string, string>;
}

export type ManifestDiffKind = 'none' | 'css-only' | 'full-reload';

export interface StylesheetChange {
    assetKey: string;
    hash: string;
}

export interface StylesheetLink {
    href: string;
}

export interface StylesheetSwap {
    link: StylesheetLink;
    newHref: string;
}

// Reload latency is dominated by rebuild and sync; polling faster only adds devtools network noise.
const POLL_INTERVAL_MILLISECONDS = 1000;

// `buildId` changes on every compilation, so it is ignored. A changed key set forces a full reload
// because a CSS hot-swap can only reach links already present on the page.
export const classifyManifestDiff = (previous: DevBuildManifest, next: DevBuildManifest): ManifestDiffKind => {
    if (previous.twigVersion !== next.twigVersion) {
        return 'full-reload';
    }

    const previousKeys = Object.keys(previous.assets);
    const nextKeys = Object.keys(next.assets);

    if (previousKeys.length !== nextKeys.length) {
        return 'full-reload';
    }

    let hasCssChange = false;

    for (const assetKey of nextKeys) {
        const previousHash = previous.assets[assetKey];

        if (previousHash === undefined) {
            return 'full-reload';
        }

        if (previousHash === next.assets[assetKey]) {
            continue;
        }

        if (assetKey.endsWith('.js')) {
            return 'full-reload';
        }

        if (assetKey.endsWith('.css')) {
            hasCssChange = true;
        }
    }

    return hasCssChange ? 'css-only' : 'none';
};

const collectChangedStylesheets = (previous: DevBuildManifest, next: DevBuildManifest): StylesheetChange[] => {
    const changedStylesheets: StylesheetChange[] = [];

    for (const assetKey of Object.keys(next.assets)) {
        if (!assetKey.endsWith('.css')) {
            continue;
        }

        if (previous.assets[assetKey] === next.assets[assetKey]) {
            continue;
        }

        changedStylesheets.push({ assetKey, hash: next.assets[assetKey] });
    }

    return changedStylesheets;
};

const linkMatchesAsset = (href: string, assetKey: string): boolean => {
    const [pathWithoutQuery] = href.split('?');

    return pathWithoutQuery.endsWith(`/${assetKey}`) || pathWithoutQuery === assetKey;
};

const buildCacheBustedHref = (href: string, hash: string): string => {
    const [pathWithoutQuery] = href.split('?');

    return `${pathWithoutQuery}?v=${hash}`;
};

export const resolveStylesheetSwaps = (
    changedStylesheets: StylesheetChange[],
    documentLinks: StylesheetLink[],
): StylesheetSwap[] => {
    const swaps: StylesheetSwap[] = [];

    for (const change of changedStylesheets) {
        for (const link of documentLinks) {
            if (!linkMatchesAsset(link.href, change.assetKey)) {
                continue;
            }

            swaps.push({ link, newHref: buildCacheBustedHref(link.href, change.hash) });
        }
    }

    return swaps;
};

const fetchManifest = async (): Promise<DevBuildManifest | undefined> => {
    try {
        const response = await fetch(`${__RELOAD_MANIFEST_URL__}?t=${Date.now()}`, { cache: 'no-store' });

        if (!response.ok) {
            return undefined;
        }

        return (await response.json()) as DevBuildManifest;
    } catch {
        // Silent by contract: a page without a manifest (a production build) is a normal state.
        return undefined;
    }
};

const applyStylesheetSwaps = (swaps: StylesheetSwap[]): void => {
    for (const swap of swaps) {
        swap.link.href = swap.newHref;
    }
};

const startPolling = (): void => {
    let baselineManifest: DevBuildManifest | undefined;

    const pollOnce = async (): Promise<void> => {
        const nextManifest = await fetchManifest();

        if (nextManifest === undefined) {
            return;
        }

        if (baselineManifest === undefined) {
            baselineManifest = nextManifest;

            return;
        }

        const diffKind = classifyManifestDiff(baselineManifest, nextManifest);

        if (diffKind === 'none') {
            return;
        }

        if (diffKind === 'full-reload') {
            reloadPreservingState();

            return;
        }

        const documentLinks = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
        applyStylesheetSwaps(
            resolveStylesheetSwaps(collectChangedStylesheets(baselineManifest, nextManifest), documentLinks),
        );
        baselineManifest = nextManifest;
    };

    setInterval(() => {
        void pollOnce();
    }, POLL_INTERVAL_MILLISECONDS);
};

// Jest imports this in Node without a DOM or the injected constant; importing must not start a timer.
if (typeof document !== 'undefined' && typeof __RELOAD_MANIFEST_URL__ !== 'undefined') {
    if (document.readyState !== 'loading') {
        restorePreservedState();
    } else {
        document.addEventListener('DOMContentLoaded', restorePreservedState, { once: true });
    }

    startPolling();
}
