import { Configuration, DefinePlugin } from 'webpack';

export default {
  stories: ['../stories/**/*.stories.mdx', '../stories/**/*.stories.tsx'],
  addons: ['@storybook/addon-essentials', './../src/client/addon/preset'],
  webpackFinal(config: Configuration) {
    config.resolve.extensions = ['.tsx', '.ts', '.jsx', '.js'];

    // css-loader
    config.module.rules[7].use[1].options.modules = 'global';

    return config;
  },
};
