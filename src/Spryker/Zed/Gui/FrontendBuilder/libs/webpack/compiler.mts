import webpack from 'webpack';
import type { Compiler, Configuration as WebpackConfiguration, Stats } from 'webpack';

const reportResult = (configuration: WebpackConfiguration, error: Error | null, stats: Stats | undefined): void => {
    if (error) {
        console.error(error.stack ?? error.message);

        const detailedError = error as Error & { details?: string };

        if (detailedError.details) {
            console.error(detailedError.details);
        }

        process.exitCode = 1;

        return;
    }

    if (!stats) {
        console.error('webpack reported neither an error nor build statistics; the build produced nothing.');
        process.exitCode = 1;

        return;
    }

    const output = stats.toString(configuration.stats);

    if (output) {
        console.log(output);
    }

    if (stats.hasErrors()) {
        process.exitCode = 1;
    }
};

const closeOnSignal = (compiler: Compiler, signal: NodeJS.Signals): void => {
    process.on(signal, () => {
        compiler.close(() => process.exit(0));
    });
};

export const compile = (configuration: WebpackConfiguration): void => {
    // webpack warns about `watch: true` without a callback; the loop runs through compiler.watch() instead.
    const { watch: isWatchMode, ...compilerConfiguration } = configuration;
    const compiler = webpack(compilerConfiguration);

    if (isWatchMode) {
        closeOnSignal(compiler, 'SIGINT');
        closeOnSignal(compiler, 'SIGTERM');

        compiler.watch(configuration.watchOptions ?? {}, (error, stats) => {
            reportResult(configuration, error ?? null, stats);
        });

        return;
    }

    compiler.run((error, stats) => {
        reportResult(configuration, error ?? null, stats);

        compiler.close((closeError) => {
            if (closeError) {
                console.error(`Failed to close the webpack compiler cleanly: ${closeError.message}`);
                process.exitCode = 1;
            }
        });
    });
};
