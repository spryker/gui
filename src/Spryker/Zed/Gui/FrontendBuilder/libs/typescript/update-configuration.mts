import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultGlobalSettings, loadProjectGlobalSettings, type GlobalSettings } from '../../settings.mts';
import { writeConfigurationFile } from './configuration-file.mts';
import type { SolutionReconciliation } from './solution-configuration.mts';
import {
    reconcileDefaultsConfiguration,
    reconcileProjectSolution,
    reconcileTypeScriptConfigurations,
} from './typescript-configuration.mts';

export const applySolutionReconciliation = (context: string, reconciliation: SolutionReconciliation): void => {
    if (reconciliation.status === 'projectOwned') {
        console.log(reconciliation.notice);

        return;
    }

    if (reconciliation.status === 'unchanged') {
        return;
    }

    writeConfigurationFile(reconciliation.filePath, reconciliation.configuration);
    console.log(`${reconciliation.status === 'created' ? 'Created' : 'Updated'}: ${reconciliation.filePath}`);
};

export const updateBackOfficeConfiguration = async (
    globalSettings: GlobalSettings = defaultGlobalSettings,
): Promise<void> => {
    const reconciledConfigurations = await reconcileTypeScriptConfigurations(globalSettings);
    const defaultsConfiguration = reconcileDefaultsConfiguration(globalSettings);

    // Both files are what the build configuration extends, so they exist before it is written.
    applySolutionReconciliation(globalSettings.context, reconcileProjectSolution(globalSettings));
    writeConfigurationFile(defaultsConfiguration.filePath, defaultsConfiguration.configuration);
    console.log(`Updated: ${defaultsConfiguration.filePath}`);

    for (const { filePath, configuration, wasCreated } of reconciledConfigurations) {
        writeConfigurationFile(filePath, configuration);
        console.log(`${wasCreated ? 'Created' : 'Updated'}: ${filePath}`);
    }
};

const isInvokedAsScript =
    process.argv[1] !== undefined && basename(process.argv[1]) === basename(fileURLToPath(import.meta.url));

if (isInvokedAsScript) {
    await updateBackOfficeConfiguration(await loadProjectGlobalSettings());
}
