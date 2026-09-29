import { relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface SassWarning {
    message: string;
    sourcePath: string | null;
}

export interface SassWarningClassification {
    owned: SassWarning[];
    vendored: SassWarning[];
}

// Inspinia is a purchased theme kept untouched; `Gui/assets/Zed/sass` extends its selectors and
// relies on its `@import` scope, so it cannot move to `@use` before the theme does.
const VENDORED_PATH_PATTERNS = [
    /[\\/]node_modules[\\/]/,
    /[\\/]assets[\\/]Inspinia2?[\\/]/,
    /[\\/]Gui[\\/]assets[\\/]Zed[\\/]sass[\\/]/,
];

// Composer installs every package under vendor/, and in a project that includes Gui itself, so its path
// no longer matches the monorepo pattern above; only the project's own sources are owned there.
const INSTALLED_PACKAGES_DIRECTORY = 'vendor';

const isInstalledPackagePath = (sourcePath: string, context: string): boolean =>
    relative(context, sourcePath).split(sep)[0] === INSTALLED_PACKAGES_DIRECTORY;

export const isVendoredSassPath = (sourcePath: string | null, context: string): boolean =>
    sourcePath === null ||
    isInstalledPackagePath(sourcePath, context) ||
    VENDORED_PATH_PATTERNS.some((pattern) => pattern.test(sourcePath));

export const resolveWarningSourcePath = (span: { url?: URL | string } | undefined): string | null => {
    if (span?.url === undefined) {
        return null;
    }

    try {
        return fileURLToPath(span.url);
    } catch {
        return null;
    }
};

export const classifySassWarnings = (warnings: SassWarning[], context: string): SassWarningClassification => ({
    owned: warnings.filter((warning) => !isVendoredSassPath(warning.sourcePath, context)),
    vendored: warnings.filter((warning) => isVendoredSassPath(warning.sourcePath, context)),
});

export const buildVendoredSummaryLine = (vendored: SassWarning[], context: string): string => {
    const countBySource = new Map<string, number>();

    for (const warning of vendored) {
        const sourcePath = warning.sourcePath ?? '(unknown source)';
        const match = /[\\/]node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/.exec(sourcePath);
        const name = match ? match[1] : relative(context, sourcePath);

        countBySource.set(name, (countBySource.get(name) ?? 0) + 1);
    }

    const breakdown = [...countBySource.entries()]
        .sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
        .map(([name, count]) => `${name} x${count}`)
        .join(', ');

    return `Sass: ${vendored.length} deprecation warning(s) from vendored stylesheets (${breakdown}).`;
};

export const buildOwnedFailureMessage = (owned: SassWarning[], context: string): string => {
    const details = owned
        .map((warning) => {
            const sourcePath = warning.sourcePath === null ? '(unknown source)' : relative(context, warning.sourcePath);

            return `  ${sourcePath}\n    ${warning.message.split('\n')[0]}`;
        })
        .join('\n');

    return (
        `Sass reported ${owned.length} deprecation warning(s) in stylesheets outside node_modules/ and ` +
        `vendor/:\n${details}\n\n` +
        `Each one is removed in Dart Sass 3, so it is a build failure here rather than a note in the ` +
        `log. Fix the rule the warning points at: "@import" of a module's own partial becomes ` +
        `"@use 'partial'" and of a package stylesheet "@use 'package/file.css' as *"; a global colour ` +
        `function becomes its "sass:color" equivalent, so darken($c, 8%) becomes ` +
        `color.adjust($c, $lightness: -8%). Suppressing the warning is not an option: "quietDeps" and ` +
        `"silenceDeprecations" are forbidden by the builder's design constraints.`
    );
};
