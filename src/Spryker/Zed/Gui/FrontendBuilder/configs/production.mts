import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import getDevelopmentConfiguration from './development.mts';
import type { AppSettings } from '../settings.mts';
import type { Configuration as WebpackConfiguration } from 'webpack';

const getConfiguration = async (appSettings: AppSettings): Promise<WebpackConfiguration> => {
    const baseConfiguration = await getDevelopmentConfiguration(appSettings);

    return {
        ...baseConfiguration,
        mode: 'production',
        devtool: false,

        optimization: {
            ...baseConfiguration.optimization,
            concatenateModules: true,
            minimizer: [
                new TerserPlugin({
                    parallel: true,
                    // Otherwise terser adds `<name>.js.LICENSE.txt` files; the output file set is a released contract.
                    extractComments: false,
                    terserOptions: {
                        output: {
                            comments: false,
                            beautify: false,
                        },
                    },
                }),

                new CssMinimizerPlugin({
                    minimizerOptions: {
                        preset: [
                            'default',
                            {
                                discardComments: { removeAll: true },
                            },
                        ],
                    },
                }),
            ],
        },
    };
};

export default getConfiguration;
