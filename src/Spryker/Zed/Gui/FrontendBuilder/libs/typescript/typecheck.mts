import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PROJECT_SETTINGS_RELATIVE_PATH, defaultGlobalSettings, loadProjectGlobalSettings } from '../../settings.mts';
import { LINT_CONFIGURATION_FILE_NAME, reconcileTypeScriptConfigurations } from './typescript-configuration.mts';

const globalSettings = (await loadProjectGlobalSettings()) ?? defaultGlobalSettings;

if (!globalSettings.typecheck) {
    console.log(
        `Back Office type checking is off: the builder setting "typecheck" is false. To enable it, pass ` +
            `{ typecheck: true } to defineConfig() in ${join(globalSettings.context, PROJECT_SETTINGS_RELATIVE_PATH)}.`,
    );
    process.exit(0);
}
const reconciledConfigurations = await reconcileTypeScriptConfigurations(globalSettings);
const lintConfiguration = reconciledConfigurations.find(
    (configuration) => configuration.fileName === LINT_CONFIGURATION_FILE_NAME,
);

if (lintConfiguration === undefined) {
    throw new Error(
        `The Back Office reconciliation did not produce ${LINT_CONFIGURATION_FILE_NAME}, so there is ` +
            `nothing to type-check against.\n` +
            `Add it to the configuration plans in libs/typescript/typescript-configuration.mts.\n`,
    );
}

if (!existsSync(lintConfiguration.filePath)) {
    throw new Error(
        `The Back Office lint configuration ${lintConfiguration.filePath} does not exist yet.\n` +
            `It is generated, and generating it is part of "npm install" through the root postinstall ` +
            `script.\n` +
            `Run "npm run update:config -w spryker-zed-gui" and try again.\n`,
    );
}

const typeScriptResult = spawnSync('npx', ['tsc', '--noEmit', '-p', lintConfiguration.filePath], {
    stdio: 'inherit',
    cwd: globalSettings.context,
});

if (typeScriptResult.error !== undefined) {
    throw new Error(
        `Failed to run the TypeScript compiler for ${lintConfiguration.filePath}: ` +
            `${typeScriptResult.error.message}.\n` +
            `Install dependencies so "npx tsc" resolves, then re-run "npm run zed:lint".\n`,
    );
}

process.exit(typeScriptResult.status ?? 1);
