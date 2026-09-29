import type { GlobalSettings } from '../settings.mts';

export interface CliArguments {
    mode: string;
}

const USAGE = `
Usage: node build.mts <mode>

Modes:
  development          Build in development mode
  development-watch    Build and watch for changes
  production           Build in production mode

Options:
  -h, --help           Show this help message
`.trim();

export const parseCliArguments = (globalSettings: GlobalSettings): CliArguments => {
    const providedArguments = process.argv.slice(globalSettings.expectedModeArgument);

    if (providedArguments.includes('-h') || providedArguments.includes('--help')) {
        console.log(USAGE);
        process.exit(0);
    }

    const mode = providedArguments.find((argument) => !argument.startsWith('-'));

    if (!mode) {
        console.error(
            'Error: a build mode is required. The builder does not guess between a development and a ' +
                'production build, because they differ in minification and in what is safe to ship.',
        );
        console.error(USAGE);
        process.exit(1);
    }

    const availableModes = Object.values(globalSettings.modes);

    if (!availableModes.includes(mode)) {
        console.error(
            `Error: unknown build mode "${mode}". Available modes: ${availableModes.join(', ')}. ` +
                `Use one of them, or run "npm run zed" / "npm run zed:production" from the project root.`,
        );
        console.error(USAGE);
        process.exit(1);
    }

    return { mode };
};
