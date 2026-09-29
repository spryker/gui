import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VENDOR_SOURCE_PREFIX, loadProjectGlobalSettings } from '../../settings.mts';

const LINTED_FILE_PATTERN = '**/assets/Zed/**/*.{css,scss}';
const PROJECT_CONFIGURATION_FILE_NAME = 'stylelint.config.backoffice.mjs';

const globalSettings = await loadProjectGlobalSettings();

const filePatterns = Object.values(globalSettings.paths.sources)
    .filter((sourceRoot) => !sourceRoot.startsWith(VENDOR_SOURCE_PREFIX))
    .map((sourceRoot) => `${sourceRoot}/${LINTED_FILE_PATTERN}`);

const projectConfigurationPath = join(globalSettings.context, PROJECT_CONFIGURATION_FILE_NAME);
const packagedConfigurationPath = fileURLToPath(new URL('./stylelint.config.mjs', import.meta.url));

if (!existsSync(packagedConfigurationPath) && !existsSync(projectConfigurationPath)) {
    process.stderr.write(
        `Stylelint configuration could not be resolved (offending path: ${packagedConfigurationPath}).\n` +
            `The packaged default is missing, which means the shipped Gui builder is incomplete.\n` +
            `Restore FrontendBuilder/libs/lint/stylelint.config.mjs in the Gui package, or add a ` +
            `project-root override at ${projectConfigurationPath}.\n`,
    );
    process.exit(1);
}

const configurationPath = existsSync(projectConfigurationPath) ? projectConfigurationPath : packagedConfigurationPath;

const result = spawnSync(
    'npx',
    [
        'stylelint',
        '--config',
        configurationPath,
        '--allow-empty-input',
        // The purchased theme and anything already minified are not ours to restyle.
        '--ignore-pattern',
        '**/assets/Inspinia/**',
        '--ignore-pattern',
        '**/assets/Inspinia2/**',
        '--ignore-pattern',
        '**/*.min.*',
        ...filePatterns,
        ...process.argv.slice(2),
    ],
    { cwd: globalSettings.context, stdio: 'inherit' },
);

if (result.error !== undefined) {
    process.stderr.write(
        `Stylelint could not be started for the Back Office stylesheets (${filePatterns.join(', ')}).\n` +
            `Reason: ${result.error.message}\n` +
            `Install dependencies so "npx stylelint" resolves, then re-run "npm run zed:stylelint".\n`,
    );
    process.exit(1);
}

process.exit(result.status ?? 1);
