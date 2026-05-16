const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const dotenv = require('dotenv');

// 加载 .env 文件
dotenv.config();

module.exports = (env, argv) => {
  const isDev = argv.mode !== 'production';
  const isAdmin = env && env.target === 'admin';

  // 从环境变量读取 Supabase 配置
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  return {
    mode: isDev ? 'development' : 'production',
    entry: isAdmin ? './src/admin/index.tsx' : './src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      // 生产环境使用 contenthash 优化缓存
      filename: isDev 
        ? (isAdmin ? 'admin-bundle.js' : 'bundle.js')
        : (isAdmin ? 'admin-bundle.[contenthash:8].js' : 'bundle.[contenthash:8].js'),
      chunkFilename: isDev 
        ? '[name].chunk.js' 
        : '[name].[contenthash:8].chunk.js',
      clean: true
    },
    // 优化构建速度
    cache: {
      type: 'filesystem',
      cacheDirectory: path.resolve(__dirname, '.webpack-cache')
    },
    optimization: {
      // 关闭不必要的优化以加快构建（开发模式）
      minimize: !isDev,
      // 生产环境启用代码分割，开发模式禁用以避免冲突
      splitChunks: isDev ? false : {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          // React 核心库
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
            name: 'vendor-react',
            priority: 40,
            reuseExistingChunk: true
          },
          // React Query
          reactQuery: {
            test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
            name: 'vendor-react-query',
            priority: 30,
            reuseExistingChunk: true
          },
          // UI 组件库
          ui: {
            test: /[\\/]node_modules[\\/](lucide-react|daisyui)[\\/]/,
            name: 'vendor-ui',
            priority: 20,
            reuseExistingChunk: true
          },
          // 其他第三方库
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true
          },
          // 默认组
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true
          }
        }
      },
    },
    // 忽略警告以减少日志输出
    infrastructureLogging: {
      level: 'warn'
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-react',
                  {
                    runtime: 'automatic',
                    development: isDev
                  }
                ],
                '@babel/preset-env',
                '@babel/preset-typescript'
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader']
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    devServer: {
      port: isAdmin ? 3267 : 3266,
      host: '0.0.0.0',
      allowedHosts: ['all', '.alibaba-inc.com'],
      static: {
        directory: path.join(__dirname, 'public'),
        publicPath: '/',
      },
      historyApiFallback: {
        index: isAdmin ? '/admin.html' : '/index.html',
        rewrites: [
          { from: /^\/_p\/\d+\//, to: isAdmin ? '/admin.html' : '/index.html' }
        ]
      },
      // Supabase API 代理配置
      proxy: [
        {
          context: ['/sb-api'],
          // 开发环境连接到 Mock server (localhost:5000)，生产环境连接到真实 Supabase
          target: isDev ? 'http://localhost:5000' : supabaseUrl,
          changeOrigin: true,
          secure: false
        }
      ]
    },
    plugins: [
      // 用户端首页（仅在非管理端构建时）
      ...(!isAdmin ? [
        new HtmlWebpackPlugin({
          template: './index.html',
          filename: 'index.html',
          inject: 'body'
        })
      ] : []),
      // 管理后台登录页面（纯 HTML，不需要 React bundle）
      new HtmlWebpackPlugin({
        template: './admin.html',
        filename: 'admin.html',
        inject: 'body',
        chunks: []  // 不注入任何 JS bundle
      }),
      // 管理后台主页面 - 仅在管理端构建时生成
      ...(isAdmin ? [
        new HtmlWebpackPlugin({
          template: './src/admin/dashboard.html',
          filename: 'admin-dashboard.html',
          inject: 'body',
          chunks: ['main']  // 注入 admin-bundle.js
        })
      ] : []),
      // 注入环境变量到客户端
      // 注意：不再注入 window.__ENV，避免覆盖代码中的代理 URL fallback
      new webpack.DefinePlugin({
        'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      })
    ]
  };
};
