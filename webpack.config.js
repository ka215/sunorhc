const ESLintPlugin = require('eslint-webpack-plugin')

module.exports = (env) => {
    const isProd = env.production || false
    console.log('webpack.config.js::isProd:', isProd, env)
    return {
        mode: (isProd ? 'production': 'development'),
        performance: {
            maxEntrypointSize: (isProd ? 300: 500) * 1024,// 300 ~ 500kB
            maxAssetSize: (isProd ? 300: 500) * 1024,// 300 ~ 500kB
        },
        entry: {
            'sunorhc': [
                './src/index.js',
            ],
        },
        output: {
            path:          `${__dirname}/dist`,
            filename:      (isProd ? '[name].min.js': '[name].js'),
            library:       'Sunorhc',
            libraryExport: 'default',
            libraryTarget: 'umd',
            globalObject:  'this',
            publicPath:    '/dist/',
        },
        //devtool: (isProd ? '': 'source-map'),
        optimization: {
            minimize: isProd,
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                presets: [
                                    '@babel/preset-env',
                                ],
                            },
                        },
                    ],
                },
            ],
        },
        target: ['web', 'es5'],
        plugins: (isProd ? []: [ new ESLintPlugin() ]),
        devServer: {
            contentBase: 'tests',
            hot: false,
            open: !isProd,
            port: 8080,
            host: 'localhost',
            //historyApiFallback: true,
        },
    }
}