import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, afterEach, jest } from '@jest/globals';
import { defineConfig, sourceLayouts, type GlobalSettings } from '../settings.mts';
import {
    BUILD_CONFIGURATION_FILE_NAME,
    DEFAULTS_CONFIGURATION_FILE_NAME,
    LINT_CONFIGURATION_FILE_NAME,
    reconcileDefaultsConfiguration,
    reconcileProjectSolution,
    reconcileTypeScriptConfigurations,
    resolveBuildConfigurationLocation,
} from '../libs/typescript/typescript-configuration.mts';
import { reconcileEntryList } from '../libs/typescript/configuration-file.mts';
import { mergeModulePathAliases } from '../libs/typescript/module-path-aliases.mts';
import { applySolutionReconciliation } from '../libs/typescript/update-configuration.mts';

const BUILDER_DIRECTORY = 'src/Spryker/Gui/src/Spryker/Zed/Gui/FrontendBuilder';
const PROJECT_BUILDER_DIRECTORY = 'vendor/spryker/gui/src/Spryker/Zed/Gui/FrontendBuilder';
const BUILDER_LADDER = '../../../../../../../..';
const BUILD_REFERENCE = `./${BUILDER_DIRECTORY}/${BUILD_CONFIGURATION_FILE_NAME}`;
const temporaryRoots: string[] = [];

const createRoot = (directories: string[]): string => {
    const root = mkdtempSync(join(tmpdir(), 'zed-builder-tsconfig-'));
    temporaryRoots.push(root);

    for (const directory of directories) {
        mkdirSync(join(root, directory), { recursive: true });
    }

    return root;
};

const createMonorepoRoot = (): string => {
    const root = createRoot(['src/Spryker/Gui/assets/Zed', 'src/Spryker/Tax/assets/Zed', BUILDER_DIRECTORY]);
    writeFileSync(join(root, 'tsconfig.json'), '{}\n');

    return root;
};

const createProjectRoot = (): string =>
    createRoot(['vendor/spryker/gui/assets/Zed', 'vendor/spryker/tax/assets/Zed', PROJECT_BUILDER_DIRECTORY]);

const settingsFor = (context: string): GlobalSettings => ({ ...defineConfig(), context });

const projectSettingsFor = (context: string): GlobalSettings => {
    const settings = defineConfig();
    const projectLayout = sourceLayouts[1];

    return {
        ...settings,
        context,
        guiFolder: projectLayout.guiFolder,
        paths: { ...settings.paths, sources: projectLayout.sources },
    };
};

const writeJson = (filePath: string, content: unknown): void => {
    writeFileSync(filePath, `${JSON.stringify(content, null, 4)}\n`);
};

const reconcileInto = async (context: string): Promise<void> => {
    const configurations = await reconcileTypeScriptConfigurations(settingsFor(context));

    for (const { filePath, configuration } of configurations) {
        writeFileSync(filePath, `${JSON.stringify(configuration, null, 4)}\n`);
    }
};

const readGenerated = (context: string, configurationPath: string): Record<string, never> =>
    JSON.parse(readFileSync(join(context, configurationPath), 'utf8'));

afterEach(() => {
    while (temporaryRoots.length > 0) {
        rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
    }
});

describe('fresh generation', () => {
    it('writes both configurations inside the builder directory', async () => {
        const context = createMonorepoRoot();

        const configurations = await reconcileTypeScriptConfigurations(settingsFor(context));

        expect(configurations.map((configuration) => configuration.configurationPath)).toEqual([
            `${BUILDER_DIRECTORY}/${BUILD_CONFIGURATION_FILE_NAME}`,
            `${BUILDER_DIRECTORY}/${LINT_CONFIGURATION_FILE_NAME}`,
        ]);
        expect(configurations.every((configuration) => configuration.wasCreated)).toBe(true);
    });

    it('extends the builder defaults first and the project root last, so project options win', async () => {
        const context = createMonorepoRoot();

        const [buildConfiguration] = await reconcileTypeScriptConfigurations(settingsFor(context));

        expect(buildConfiguration.configuration.extends).toEqual([
            `./${DEFAULTS_CONFIGURATION_FILE_NAME}`,
            `${BUILDER_LADDER}/tsconfig.json`,
        ]);
    });

    it('keeps only the generated paths inline, leaving every other compiler option to the defaults', async () => {
        const context = createMonorepoRoot();

        const [buildConfiguration] = await reconcileTypeScriptConfigurations(settingsFor(context));

        expect(Object.keys(buildConfiguration.configuration.compilerOptions!)).toEqual(['paths']);
    });

    it('generates one @zed alias per discovered module, kebab-cased', async () => {
        const context = createMonorepoRoot();
        mkdirSync(join(context, 'src/Spryker/ProductRelationGui/assets/Zed'), { recursive: true });

        const [buildConfiguration] = await reconcileTypeScriptConfigurations(settingsFor(context));
        const paths = buildConfiguration.configuration.compilerOptions!.paths!;

        expect(paths['@zed/product-relation-gui/*']).toEqual([
            '../../../../../../../../src/Spryker/ProductRelationGui/assets/Zed/*',
        ]);
        expect(paths['@zed/tax/*']).toEqual(['../../../../../../../../src/Spryker/Tax/assets/Zed/*']);
    });

    it('keeps the three legacy aliases, in both the bare and the prefix form webpack needs', async () => {
        const context = createMonorepoRoot();

        const [buildConfiguration] = await reconcileTypeScriptConfigurations(settingsFor(context));
        const paths = buildConfiguration.configuration.compilerOptions!.paths!;

        expect(paths.ZedGui).toEqual(['../../../../../../../../src/Spryker/Gui/assets/Zed/js/modules/commons']);
        expect(paths['ZedGuiModules/*']).toEqual(['../../../../../../../../src/Spryker/Gui/assets/Zed/js/modules/*']);
        expect(paths.ZedGuiEditorConfiguration).toBeDefined();
    });

    it('re-enables noImplicitAny in the defaults, because the shared defaults turn it off', () => {
        const context = createMonorepoRoot();

        const { configuration } = reconcileDefaultsConfiguration(settingsFor(context));

        expect(configuration.compilerOptions!.strict).toBe(true);
        expect(configuration.compilerOptions!.noImplicitAny).toBe(true);
    });

    it('excludes installed third-party sources from the lint configuration only', async () => {
        const context = createMonorepoRoot();

        const [buildConfiguration, lintConfiguration] = await reconcileTypeScriptConfigurations(settingsFor(context));
        const mentionsVendor = (include: string[] | undefined): boolean =>
            (include ?? []).some((entry) => entry.includes('/vendor/'));

        expect(mentionsVendor(buildConfiguration.configuration.include)).toBe(true);
        expect(mentionsVendor(lintConfiguration.configuration.include)).toBe(false);
    });
});

describe('re-running the reconciliation', () => {
    it('produces no change on the second run', async () => {
        const context = createMonorepoRoot();

        await reconcileInto(context);
        const afterFirstRun = readGenerated(context, `${BUILDER_DIRECTORY}/${BUILD_CONFIGURATION_FILE_NAME}`);
        await reconcileInto(context);
        const afterSecondRun = readGenerated(context, `${BUILDER_DIRECTORY}/${BUILD_CONFIGURATION_FILE_NAME}`);

        expect(afterSecondRun).toEqual(afterFirstRun);
    });

    it('adds the alias of a module that appeared since the last run', async () => {
        const context = createMonorepoRoot();
        await reconcileInto(context);

        mkdirSync(join(context, 'src/Spryker/Discount/assets/Zed'), { recursive: true });
        const [buildConfiguration] = await reconcileTypeScriptConfigurations(settingsFor(context));

        expect(buildConfiguration.configuration.compilerOptions!.paths!['@zed/discount/*']).toBeDefined();
    });

    it('drops the alias of a module that no longer exists, and keeps a project alias', async () => {
        const context = createMonorepoRoot();
        await reconcileInto(context);

        const configurationPath = join(context, BUILDER_DIRECTORY, BUILD_CONFIGURATION_FILE_NAME);
        const configuration = JSON.parse(readFileSync(configurationPath, 'utf8'));
        configuration.compilerOptions.paths['@zed/removed-module/*'] = [
            '../../../../../../../../src/Spryker/RemovedModule/assets/Zed/*',
        ];
        configuration.compilerOptions.paths['MyProjectThing/*'] = ['../../../../../../../../src/Pyz/thing/*'];
        writeFileSync(configurationPath, `${JSON.stringify(configuration, null, 4)}\n`);

        const [buildConfiguration] = await reconcileTypeScriptConfigurations(settingsFor(context));
        const paths = buildConfiguration.configuration.compilerOptions!.paths!;

        expect(paths['@zed/removed-module/*']).toBeUndefined();
        expect(paths['MyProjectThing/*']).toBeDefined();
    });

    it('keeps an include entry the project added and does not duplicate the generated ones', async () => {
        const context = createMonorepoRoot();
        await reconcileInto(context);

        const configurationPath = join(context, BUILDER_DIRECTORY, LINT_CONFIGURATION_FILE_NAME);
        const configuration = JSON.parse(readFileSync(configurationPath, 'utf8'));
        const generatedCount = configuration.include.length;
        configuration.include.push('../../../../../../../../src/Pyz/custom/**/*.ts');
        writeFileSync(configurationPath, `${JSON.stringify(configuration, null, 4)}\n`);

        const lintConfiguration = (await reconcileTypeScriptConfigurations(settingsFor(context)))[1];

        expect(lintConfiguration.configuration.include).toHaveLength(generatedCount + 1);
        expect(lintConfiguration.configuration.include).toContain('../../../../../../../../src/Pyz/custom/**/*.ts');
    });

    it('replaces an include entry left behind by the other source layout', async () => {
        const context = createMonorepoRoot();
        await reconcileInto(context);

        const configurationPath = join(context, BUILDER_DIRECTORY, LINT_CONFIGURATION_FILE_NAME);
        const configuration = JSON.parse(readFileSync(configurationPath, 'utf8'));
        configuration.include.push('../../../../../../../../src/Pyz/Zed/**/assets/Zed/**/*.ts');
        writeFileSync(configurationPath, `${JSON.stringify(configuration, null, 4)}\n`);

        const lintConfiguration = (await reconcileTypeScriptConfigurations(settingsFor(context)))[1];

        expect(lintConfiguration.configuration.include).not.toContain(
            '../../../../../../../../src/Pyz/Zed/**/assets/Zed/**/*.ts',
        );
    });
});

describe('a project that keeps its own copy at the root', () => {
    it('reconciles that copy and writes no second one inside the builder', async () => {
        const context = createMonorepoRoot();
        writeFileSync(join(context, BUILD_CONFIGURATION_FILE_NAME), '{}\n');

        const [buildConfiguration] = await reconcileTypeScriptConfigurations(settingsFor(context));

        expect(buildConfiguration.configurationPath).toBe(BUILD_CONFIGURATION_FILE_NAME);
        expect(existsSync(join(context, BUILDER_DIRECTORY, BUILD_CONFIGURATION_FILE_NAME))).toBe(false);
    });

    it('writes its paths without a parent ladder, because the file sits at the root', async () => {
        const context = createMonorepoRoot();
        writeFileSync(join(context, BUILD_CONFIGURATION_FILE_NAME), '{}\n');

        const [buildConfiguration] = await reconcileTypeScriptConfigurations(settingsFor(context));

        expect(buildConfiguration.configuration.compilerOptions!.paths!['@zed/tax/*']).toEqual([
            './src/Spryker/Tax/assets/Zed/*',
        ]);
    });

    it('is the location the builder reads its aliases from', async () => {
        const context = createMonorepoRoot();
        writeFileSync(join(context, BUILD_CONFIGURATION_FILE_NAME), '{}\n');

        expect(resolveBuildConfigurationLocation(context).directory).toBe('');
        expect(resolveBuildConfigurationLocation(createMonorepoRoot()).directory).toBe(BUILDER_DIRECTORY);
    });
});

describe('the builder-owned defaults', () => {
    it.each([
        ['monorepo', createMonorepoRoot, settingsFor, BUILDER_DIRECTORY],
        ['project', createProjectRoot, projectSettingsFor, PROJECT_BUILDER_DIRECTORY],
    ])(
        'sits next to the build configuration and climbs back to the project root in the %s layout',
        (_layoutName, createLayoutRoot, settingsOf, builderDirectory) => {
            const context = createLayoutRoot();

            const { filePath, configuration } = reconcileDefaultsConfiguration(settingsOf(context));

            expect(filePath).toBe(join(context, builderDirectory, DEFAULTS_CONFIGURATION_FILE_NAME));
            expect(configuration.compilerOptions!.rootDir).toBe(BUILDER_LADDER);
            expect(configuration.compilerOptions!.typeRoots).toEqual([`${BUILDER_LADDER}/node_modules/@types`]);
        },
    );

    it('prefixes every exclude entry with the ladder, the unanchored ones included', () => {
        const context = createMonorepoRoot();

        const { configuration } = reconcileDefaultsConfiguration(settingsFor(context));

        expect(configuration.exclude).toEqual([
            `${BUILDER_LADDER}/**/node_modules/**`,
            `${BUILDER_LADDER}/**/*.spec.ts`,
            `${BUILDER_LADDER}/**/*.test.ts`,
            `${BUILDER_LADDER}/public`,
            `${BUILDER_LADDER}/dist`,
            `${BUILDER_LADDER}/**/dist/**`,
        ]);
    });

    it('declares no paths, because the build configuration declares its own and they would replace these', () => {
        const context = createMonorepoRoot();

        const { configuration } = reconcileDefaultsConfiguration(settingsFor(context));

        expect(configuration.compilerOptions!.paths).toBeUndefined();
    });
});

describe('an existing build configuration', () => {
    const existingConfiguration = {
        extends: `${BUILDER_LADDER}/tsconfig.json`,
        compilerOptions: { strict: true, noUnusedLocals: true },
        include: [],
    };

    it('gets the generated extends list on every run and keeps every compiler option', async () => {
        const context = createMonorepoRoot();
        writeJson(join(context, BUILDER_DIRECTORY, BUILD_CONFIGURATION_FILE_NAME), existingConfiguration);

        const [buildConfiguration] = await reconcileTypeScriptConfigurations(settingsFor(context));
        const { paths, ...compilerOptions } = buildConfiguration.configuration.compilerOptions!;

        expect(buildConfiguration.configuration.extends).toEqual([
            `./${DEFAULTS_CONFIGURATION_FILE_NAME}`,
            `${BUILDER_LADDER}/tsconfig.json`,
        ]);
        expect(compilerOptions).toEqual({ strict: true, noUnusedLocals: true });
        expect(paths).toBeDefined();
    });

    it('does not rewrite the extends of a copy the project keeps in its root', async () => {
        const context = createMonorepoRoot();
        writeJson(join(context, BUILD_CONFIGURATION_FILE_NAME), {
            ...existingConfiguration,
            extends: './tsconfig.json',
        });

        const [buildConfiguration] = await reconcileTypeScriptConfigurations(settingsFor(context));

        expect(buildConfiguration.configuration.extends).toBe('./tsconfig.json');
    });
});

describe('the project root solution file', () => {
    it('is created with a reference to the build configuration when the root has no tsconfig.json', () => {
        const context = createProjectRoot();

        const reconciliation = reconcileProjectSolution(projectSettingsFor(context));

        expect(reconciliation).toMatchObject({
            status: 'created',
            configuration: {
                files: [],
                references: [{ path: `./${PROJECT_BUILDER_DIRECTORY}/${BUILD_CONFIGURATION_FILE_NAME}` }],
            },
        });
    });

    it('gains the reference after the ones another builder added', () => {
        const context = createMonorepoRoot();
        writeJson(join(context, 'tsconfig.json'), { files: [], references: [{ path: './other/tsconfig.json' }] });

        const reconciliation = reconcileProjectSolution(settingsFor(context));

        expect(reconciliation).toMatchObject({
            status: 'updated',
            configuration: { references: [{ path: './other/tsconfig.json' }, { path: BUILD_REFERENCE }] },
        });
    });

    it('keeps a single reference when the same configuration is listed more than once', () => {
        const context = createMonorepoRoot();
        writeJson(join(context, 'tsconfig.json'), {
            files: [],
            references: [{ path: BUILD_REFERENCE }, { path: BUILD_REFERENCE.slice(2) }],
        });

        const reconciliation = reconcileProjectSolution(settingsFor(context));

        expect(reconciliation).toMatchObject({ configuration: { references: [{ path: BUILD_REFERENCE }] } });
    });

    it('reports no change when the reference is already there', () => {
        const context = createMonorepoRoot();
        writeJson(join(context, 'tsconfig.json'), { files: [], references: [{ path: BUILD_REFERENCE }] });

        expect(reconcileProjectSolution(settingsFor(context)).status).toBe('unchanged');
    });

    it('replaces, in place, the reference the other source layout wrote', () => {
        const context = createMonorepoRoot();
        writeJson(join(context, 'tsconfig.json'), {
            files: [],
            references: [
                { path: `./${PROJECT_BUILDER_DIRECTORY}/${BUILD_CONFIGURATION_FILE_NAME}` },
                { path: './other/tsconfig.json' },
            ],
        });

        const reconciliation = reconcileProjectSolution(settingsFor(context));

        expect(reconciliation).toMatchObject({
            configuration: { references: [{ path: BUILD_REFERENCE }, { path: './other/tsconfig.json' }] },
        });
    });

    it('leaves a complete root configuration byte-identical and says how to add the reference', () => {
        const context = createMonorepoRoot();
        const rootConfiguration = '{\n  "compilerOptions": { "strict": true },\n  "include": ["src"]\n}\n';
        writeFileSync(join(context, 'tsconfig.json'), rootConfiguration);
        const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

        applySolutionReconciliation(context, reconcileProjectSolution(settingsFor(context)));

        expect(readFileSync(join(context, 'tsconfig.json'), 'utf8')).toBe(rootConfiguration);
        expect(log).toHaveBeenCalledTimes(1);
        expect(String(log.mock.calls[0][0])).toContain(join(context, 'tsconfig.json'));
        expect(String(log.mock.calls[0][0])).toContain('complete TypeScript configuration');
        expect(String(log.mock.calls[0][0])).toContain(BUILD_REFERENCE);
        log.mockRestore();
    });

    it('leaves a root it cannot parse as plain JSON unchanged and names the parse failure', () => {
        const context = createMonorepoRoot();
        writeFileSync(join(context, 'tsconfig.json'), '{\n  // project options\n  "files": []\n}\n');

        const reconciliation = reconcileProjectSolution(settingsFor(context));

        expect(reconciliation.status).toBe('projectOwned');
        expect(reconciliation.status === 'projectOwned' && reconciliation.notice).toContain('not plain JSON');
    });
});

describe('reconciliation primitives', () => {
    it('puts generated entries first and project entries after them', () => {
        expect(reconcileEntryList(['project/a', 'generated/x'], ['generated/x'], (entry) => entry === 'generated/x')) //
            .toEqual(['generated/x', 'project/a']);
    });

    it('lets the generator own the value of an alias it emits, overwriting a hand edit', () => {
        expect(mergeModulePathAliases({ '@zed/tax/*': ['./wrong'] }, { '@zed/tax/*': ['./right'] })).toEqual({
            '@zed/tax/*': ['./right'],
        });
    });
});
