const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = (env, argv) => {
  const isDev = argv.mode !== 'production';

  return {
    mode: isDev ? 'development' : 'production',
    devtool: isDev ? 'eval-cheap-module-source-map' : false,
    entry: './src/main.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.js',
      clean: true,
    },

    // Vue 2 / Ant Design Vue / vue-router 走 CDN 外部注入
    externals: {
      vue: 'Vue',
      'vue-router': 'VueRouter',
      'ant-design-vue': 'antd',
    },

    resolve: {
      extensions: ['.js', '.vue'],
    },

    module: {
      rules: [
        // ── 编译期 testid 注入 (pre-enforce, 优先于 vue-loader) ──
        {
          test: /\.vue$/,
          enforce: 'pre',
          exclude: /node_modules/,
          use: [
            {
              loader: '@testid/webpack-plugin-vue2-auto-testid',
              options: {
                globalPrefix: 'demo',
                viewPatterns: ['/views/', 'App.vue'],
                commonPatterns: ['/components/', '/common/'],
                onlyInteractive: false,
              },
            },
          ],
        },
        // ── Vue SFC 编译 ──
        {
          test: /\.vue$/,
          loader: 'vue-loader',
        },
        // ── CSS ──
        {
          test: /\.css$/,
          use: ['vue-style-loader', 'css-loader'],
        },
      ],
    },

    plugins: [
      new VueLoaderPlugin(),
      new HtmlWebpackPlugin({
        template: './index.html',
      }),
    ],

    devServer: {
      port: 3200,
      open: true,
      hot: true,
    },
  };
};
