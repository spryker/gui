import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from '@jest/globals';
import { getAliasList } from '../libs/webpack/alias.mts';
import { BUILD_CONFIGURATION_FILE_NAME } from '../libs/typescript/typescript-configuration.mts';

const BUILDER_DIRECTORY = 'src/Spryker/Gui/src/Spryker/Zed/Gui/FrontendBuilder';
const temporaryRoots: string[] = [];

const createContextWithPaths = (paths: Record<string, string[]>): string => {
    const context = mkdtempSync(join(tmpdir(), 'zed-builder-alias-'));
    temporaryRoots.push(context);
    mkdirSync(join(context, BUILDER_DIRECTORY), { recursive: true });
    writeFileSync(
        join(context, BUILDER_DIRECTORY, BUILD_CONFIGURATION_FILE_NAME),
        JSON.stringify({ compilerOptions: { paths } }),
    );

    return context;
};

afterEach(() => {
    while (temporaryRoots.length > 0) {
        rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
});

describe('the webpack alias mirror', () => {
    it('mirrors a list of targets as an ordered webpack alias array', () => {
        const context = createContextWithPaths({
            '@shared/ai-commerce/*': ['../project/Theme/default/*', '../core/Theme/default/*'],
        });

        expect(getAliasList(context)['@shared/ai-commerce']).toEqual([
            join(context, BUILDER_DIRECTORY, '../project/Theme/default'),
            join(context, BUILDER_DIRECTORY, '../core/Theme/default'),
        ]);
    });

    it('keeps a single-target alias a plain string', () => {
        const context = createContextWithPaths({ '@zed/tax/*': ['../tax/assets/Zed/*'] });

        expect(getAliasList(context)['@zed/tax']).toBe(join(context, BUILDER_DIRECTORY, '../tax/assets/Zed'));
    });
});
