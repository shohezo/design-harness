import '../ui/src/tokens/tokens.css';
import '../ui/src/styles/base.css';
import '../ui/src/styles/components.css';
import '../ui/src/styles/sections.css';

/** @type {import('@storybook/html-vite').Preview} */
export default {
  parameters: {
    layout: 'padded',
    options: { storySort: { order: ['Tokens', 'Parts', 'Sections'] } },
    // 各 Story の「Accessibility」タブで axe の結果を見る（テストは落とさない）
    a11y: { test: 'todo' },
  },
};
