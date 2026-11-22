/** @type {import('@storybook/html-vite').StorybookConfig} */
export default {
  stories: ['../ui/src/stories/**/*.stories.js'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: { name: '@storybook/html-vite', options: {} },
};
