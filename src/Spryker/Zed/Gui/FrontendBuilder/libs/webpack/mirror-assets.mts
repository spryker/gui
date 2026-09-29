import { cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { Compiler } from 'webpack';

const PLUGIN_NAME = 'SprykerZedMirrorAssetsPlugin';

// Load-bearing: docker-sdk's mount.sh gates its "[BUILT]" check on the mirror. The whole directory is
// copied so sibling output such as `falcon-ui` is mirrored too.
export class MirrorAssetsPlugin {
    private readonly sourceDirectory: string;

    private readonly targetDirectory: string;

    public constructor(sourceDirectory: string, targetDirectory: string) {
        this.sourceDirectory = sourceDirectory;
        this.targetDirectory = targetDirectory;
    }

    public apply(compiler: Compiler): void {
        compiler.hooks.done.tapPromise(PLUGIN_NAME, async (stats) => {
            if (stats.hasErrors()) {
                return;
            }

            await this.mirror();
        });
    }

    public async mirror(): Promise<void> {
        if (!existsSync(this.sourceDirectory)) {
            throw new Error(
                `Cannot mirror the Back Office assets: the build output directory ` +
                    `${this.sourceDirectory} does not exist. docker-sdk's mount.sh gates its "[BUILT]" ` +
                    `check on ${this.targetDirectory}, so the mirror cannot be skipped. Run the build ` +
                    `from the project root so the output lands where the builder expects it.`,
            );
        }

        try {
            await rm(this.targetDirectory, { recursive: true, force: true });
            await cp(this.sourceDirectory, this.targetDirectory, {
                recursive: true,
                dereference: false,
                verbatimSymlinks: true,
            });
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);

            throw new Error(
                `Failed to mirror ${this.sourceDirectory} to ${this.targetDirectory}: ${reason}. ` +
                    `docker-sdk's mount.sh reports the assets as not built without that directory. ` +
                    `Check the permissions on ${this.targetDirectory} and that no process holds files ` +
                    `open there.`,
            );
        }
    }
}
