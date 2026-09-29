import { pathToFileURL } from 'node:url';
import { defaultGlobalSettings, getAppSettings, loadProjectGlobalSettings, resolveSourceLayout } from './settings.mts';
import type { AppSettings, GlobalSettings } from './settings.mts';
import { parseCliArguments } from './libs/command-line-parser.mts';
import { compile } from './libs/webpack/compiler.mts';
import type { Configuration as WebpackConfiguration } from 'webpack';

type ConfigurationFactory = (appSettings: AppSettings) => Promise<WebpackConfiguration>;

const modeConfigurationMap: Record<string, () => Promise<{ default: ConfigurationFactory }>> = {
    development: () => import('./configs/development.mts'),
    'development-watch': () => import('./configs/development-watch.mts'),
    production: () => import('./configs/production.mts'),
};

export const run = async (globalSettings: GlobalSettings = defaultGlobalSettings): Promise<void> => {
    const { mode } = parseCliArguments(globalSettings);

    // An empty build is almost always a layout or working-directory problem, so the layout is logged.
    console.log(`Source layout: ${resolveSourceLayout(globalSettings.context).name}`);

    const configurationModule = modeConfigurationMap[mode];

    if (!configurationModule) {
        console.error(
            `Build mode "${mode}" is accepted by the command line parser but has no configuration ` +
                `module. Add it to modeConfigurationMap in build.mts.`,
        );
        process.exit(1);
    }

    const { default: getConfiguration } = await configurationModule();
    const configuration = await getConfiguration(getAppSettings(globalSettings, mode));

    compile(configuration);
};

const isDirectInvocation = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectInvocation) {
    run(await loadProjectGlobalSettings());
}
