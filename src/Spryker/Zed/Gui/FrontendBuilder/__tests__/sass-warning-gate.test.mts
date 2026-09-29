import { pathToFileURL } from 'node:url';
import { describe, it, expect } from '@jest/globals';
import {
    buildOwnedFailureMessage,
    buildVendoredSummaryLine,
    classifySassWarnings,
    isVendoredSassPath,
    resolveWarningSourcePath,
} from '../libs/sass/warning-gate.mts';

const warningAt = (sourcePath: string | null, message = 'Sass @import rules are deprecated.') => ({
    message,
    sourcePath,
});

describe('classifying where a deprecation comes from', () => {
    it('treats a module stylesheet as ours, so the build fails on it', () => {
        expect(isVendoredSassPath('/repo/src/Spryker/Discount/assets/Zed/sass/main.scss', '/repo')).toBe(false);
    });

    it('treats an installed package as vendored', () => {
        expect(isVendoredSassPath('/repo/node_modules/bootstrap/scss/_variables.scss', '/repo')).toBe(true);
    });

    it('treats the purchased Inspinia theme as vendored, although it lives in the repository', () => {
        expect(isVendoredSassPath('/repo/src/Spryker/Gui/assets/Inspinia2/scss/app.scss', '/repo')).toBe(true);
        expect(isVendoredSassPath('/repo/src/Spryker/Gui/assets/Inspinia/css/style.css', '/repo')).toBe(true);
    });

    it('treats the Gui stylesheet graph that consumes the theme as vendored too', () => {
        expect(isVendoredSassPath('/repo/src/Spryker/Gui/assets/Zed/sass/main.scss', '/repo')).toBe(true);
    });

    it('treats every stylesheet composer installed under vendor/ as vendored in the project layout', () => {
        expect(isVendoredSassPath('/project/vendor/spryker/gui/assets/Zed/sass/main.scss', '/project')).toBe(true);
        expect(isVendoredSassPath('/project/vendor/spryker/discount/assets/Zed/sass/main.scss', '/project')).toBe(true);
    });

    it('keeps the project sources owned in the project layout, so the build still fails on them', () => {
        expect(isVendoredSassPath('/project/src/Pyz/Zed/Discount/assets/Zed/sass/main.scss', '/project')).toBe(false);
    });

    it('treats a warning with no source as vendored rather than failing the build on it', () => {
        expect(isVendoredSassPath(null, '/repo')).toBe(true);
    });

    it('splits a mixed list into the part that fails and the part that is only reported', () => {
        const { owned, vendored } = classifySassWarnings(
            [
                warningAt('/repo/src/Spryker/Discount/assets/Zed/sass/main.scss'),
                warningAt('/repo/node_modules/bootstrap/scss/_variables.scss'),
                warningAt('/repo/src/Spryker/Gui/assets/Inspinia2/scss/app.scss'),
            ],
            '/repo',
        );

        expect(owned).toHaveLength(1);
        expect(vendored).toHaveLength(2);
    });
});

describe('the source of a warning', () => {
    it('is read from the span the compiler reports', () => {
        expect(resolveWarningSourcePath({ url: pathToFileURL('/repo/a.scss') })).toBe('/repo/a.scss');
    });

    it('is null when the compiler reports no span, rather than throwing mid-build', () => {
        expect(resolveWarningSourcePath(undefined)).toBeNull();
        expect(resolveWarningSourcePath({ url: 'not-a-file-url' })).toBeNull();
    });
});

describe('what the developer is told', () => {
    it('summarises vendored warnings on one line, grouped by package', () => {
        const line = buildVendoredSummaryLine(
            [
                warningAt('/repo/node_modules/bootstrap/scss/_variables.scss'),
                warningAt('/repo/node_modules/bootstrap/scss/_mixins.scss'),
                warningAt('/repo/node_modules/@fortawesome/fontawesome-free/css/all.css'),
            ],
            '/repo',
        );

        expect(line).toContain('3 deprecation warning(s)');
        expect(line).toContain('bootstrap x2');
        expect(line).toContain('@fortawesome/fontawesome-free x1');
    });

    it('names each offending file, the reason and the fix when the build fails', () => {
        const message = buildOwnedFailureMessage(
            [warningAt('/repo/src/Spryker/Discount/assets/Zed/sass/main.scss')],
            '/repo',
        );

        expect(message).toContain('src/Spryker/Discount/assets/Zed/sass/main.scss');
        expect(message).toContain('Sass @import rules are deprecated');
        expect(message).toContain("@use 'package/file.css' as *");
        expect(message).toContain('color.adjust');
        expect(message).toContain('silenceDeprecations');
    });
});
