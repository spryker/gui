import { dirname, join, resolve } from 'node:path';
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import autoprefixer from 'autoprefixer';
import * as sassEmbedded from 'sass-embedded';
import { findEntryPoints, findResolveModuleDirectories } from '../libs/webpack/finder.mts';
import { configureEntryPoints } from '../libs/webpack/entry-configurator.mts';
import { cleanDirectories } from '../libs/webpack/clean-dirs.mts';
import { getAliasList } from '../libs/webpack/alias.mts';
import { MirrorAssetsPlugin } from '../libs/webpack/mirror-assets.mts';
import { MANIFEST_FILENAME } from '../libs/reload/manifest-writer.mts';
import {
    buildOwnedFailureMessage,
    buildVendoredSummaryLine,
    classifySassWarnings,
    resolveWarningSourcePath,
} from '../libs/sass/warning-gate.mts';
import type { SassWarning } from '../libs/sass/warning-gate.mts';
import type { AppSettings } from '../settings.mts';
import type { Configuration as WebpackConfiguration } from 'webpack';

const builderRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// The toolchain is declared by the Gui package, not an ancestor of this directory; bare names
// would resolve to whatever copy the project root hoists.
const guiPackageRoot = resolve(builderRoot, '../../../../../assets/Zed');
const loaderResolutionDirectories = [join(guiPackageRoot, 'node_modules'), 'node_modules'];
const resolveFromGuiPackage = createRequire(join(guiPackageRoot, 'package.json')).resolve;

export const getConfiguration = async (appSettings: AppSettings): Promise<WebpackConfiguration> => {
    const [entryPoints, zedModuleDirectories] = await Promise.all([
        findEntryPoints(appSettings.find.entryPoints),
        findResolveModuleDirectories(appSettings.find.resolveModules),
    ]);

    const outputDirectory = join(appSettings.context, appSettings.paths.publicDir);

    const sassWarnings: SassWarning[] = [];

    cleanDirectories(
        appSettings.paths.outputDirectoryNames.map((directoryName) => join(outputDirectory, directoryName)),
    );

    // Watch mode writes the live-reload manifest here; a one-shot build must not leave a stale one behind.
    rmSync(join(outputDirectory, MANIFEST_FILENAME), { force: true });

    return {
        context: appSettings.context,
        mode: 'development',
        // The output file set is a released contract, so source maps stay inline.
        devtool: 'inline-source-map',
        stats: 'errors-warnings',

        entry: configureEntryPoints(entryPoints, appSettings.runtimeEntryName),

        output: {
            path: outputDirectory,
            filename: './js/[name].js',
            // Entry names appear verbatim in Twig, so they stay unhashed; chunk names appear nowhere.
            chunkFilename: './js/chunks/[name].[contenthash].js',
            // Follows the loaded script, so a repointed GuiConstants::ZED_ASSETS_BASE_URL needs no second setting.
            publicPath: 'auto',
        },

        resolve: {
            modules: [
                ...zedModuleDirectories,
                'node_modules',
                appSettings.paths.sourcePath,
                appSettings.paths.sources.core,
                appSettings.paths.sources.features,
            ],
            extensions: ['.ts', '.js', '.css', '.scss'],
            // Shared with the generated TypeScript configuration so the editor and bundler resolve alike.
            alias: getAliasList(appSettings.context),
        },

        resolveLoader: {
            modules: loaderResolutionDirectories,
        },

        module: {
            rules: [
                {
                    test: /datatables\.net.*/,
                    use: {
                        loader: 'imports-loader',
                        options: { additionalCode: 'var define = false;' },
                    },
                },
                {
                    test: /(jquery-migrate)/,
                    use: {
                        loader: 'imports-loader',
                        options: { additionalCode: 'var define = false;' },
                    },
                },
                {
                    test: /\.m?js$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            cacheDirectory: true,
                            presets: [resolveFromGuiPackage('@babel/preset-env')],
                        },
                    },
                },
                {
                    // Babel erases types without checking them; `npm run zed:lint` checks them.
                    test: /\.ts$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            cacheDirectory: true,
                            presets: [
                                [
                                    resolveFromGuiPackage('@babel/preset-env'),
                                    {
                                        loose: true,
                                        modules: false,
                                        targets: { esmodules: true },
                                        useBuiltIns: false,
                                    },
                                ],
                                resolveFromGuiPackage('@babel/preset-typescript'),
                            ],
                            plugins: [
                                [resolveFromGuiPackage('@babel/plugin-transform-runtime')],
                                [resolveFromGuiPackage('@babel/plugin-transform-class-properties'), { loose: true }],
                            ],
                        },
                    },
                },
                {
                    test: /\.s?css/i,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: {
                                url: {
                                    // Served by Zed itself, not emitted by the build.
                                    filter: (url: string): boolean =>
                                        !(url.includes('assets/img/') || url.includes('bundles/images/')),
                                },
                                importLoaders: 1,
                            },
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                postcssOptions: {
                                    plugins: [autoprefixer],
                                },
                            },
                        },
                        {
                            // Sass flattens imports, so relative url() must be rewritten against the
                            // declaring partial; this needs the source maps sass-loader emits.
                            loader: 'resolve-url-loader',
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                implementation: sassEmbedded,
                                api: 'modern-compiler',
                                sourceMap: true,
                                sassOptions: {
                                    // `@use` ignores webpack's `~` prefix; the order matches `resolve.modules`.
                                    loadPaths: [...zedModuleDirectories, join(appSettings.context, 'node_modules')],
                                    logger: {
                                        warn: (message: string, options: { span?: { url?: URL | string } }): void => {
                                            sassWarnings.push({
                                                message,
                                                sourcePath: resolveWarningSourcePath(options.span),
                                            });
                                        },
                                    },
                                },
                            },
                        },
                    ],
                },
                {
                    test: /\.(ttf|woff2?|eot|svg|otf)\??(\d*\w*=?\.?)+$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'fonts/[name][ext]',
                    },
                },
                {
                    test: /\.(jpe?g|png|gif|svg)\??(\d*\w*=?\.?)+$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'img/[name][ext]',
                    },
                },
            ],
        },

        optimization: {
            runtimeChunk: {
                name: appSettings.runtimeEntryName,
            },
            concatenateModules: false,
            splitChunks: {
                cacheGroups: {
                    default: false,
                    defaultVendors: false,
                    // No fixed name: it would merge every lazy library into one chunk (highlight.js pulling mermaid).
                    asyncVendors: {
                        test: /[\\/]node_modules[\\/]/,
                        chunks: 'async',
                        reuseExistingChunk: true,
                    },
                },
            },
        },

        plugins: [
            new webpack.DefinePlugin({
                DEV: !appSettings.isProductionMode,
                WATCH: appSettings.isWatchMode,
                'require.specified': 'require.resolve',
            }),

            new webpack.EnvironmentPlugin({ NODE_DEBUG: '' }),

            new webpack.ProvidePlugin({
                $: 'jquery',
                jQuery: 'jquery',
                SprykerAjax: `${appSettings.guiFolder}/assets/Zed/js/modules/legacy/SprykerAjax`,
                SprykerAjaxCallbacks: `${appSettings.guiFolder}/assets/Zed/js/modules/legacy/SprykerAjaxCallbacks`,
                SprykerAlert: `${appSettings.guiFolder}/assets/Zed/js/modules/legacy/SprykerAlert`,
            }),

            new MiniCssExtractPlugin({
                filename: './css/[name].css',
                chunkFilename: './css/chunks/[name].[contenthash].css',
            }),

            {
                apply(compiler): void {
                    compiler.hooks.afterEmit.tap('SprykerZedSassWarningGate', (compilation): void => {
                        const { owned, vendored } = classifySassWarnings(sassWarnings, appSettings.context);

                        if (vendored.length > 0) {
                            console.log(buildVendoredSummaryLine(vendored, appSettings.context));
                        }

                        if (owned.length > 0) {
                            compilation.errors.push(new Error(buildOwnedFailureMessage(owned, appSettings.context)));
                        }

                        // Reset per compilation, or an already-fixed warning would keep failing watch rebuilds.
                        sassWarnings.length = 0;
                    });
                },
            },

            new MirrorAssetsPlugin(outputDirectory, join(appSettings.context, appSettings.paths.mirrorDir)),
        ],
    };
};

export default getConfiguration;
