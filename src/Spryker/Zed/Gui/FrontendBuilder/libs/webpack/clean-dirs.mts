import { existsSync, rmSync } from 'node:fs';

// Never pass the parent directory: FalconUi builds into `public/Backoffice/assets/falcon-ui`.
export const cleanDirectories = (directoryList: string[]): void => {
    for (const directory of directoryList) {
        if (!existsSync(directory)) {
            continue;
        }

        rmSync(directory, { recursive: true, force: true });
    }
};
