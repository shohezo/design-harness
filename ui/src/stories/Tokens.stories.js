// tokens.json をそのまま読んで並べる（値を Story に書き写さない）
import tokens from '../tokens/tokens.json';

export default { title: 'Tokens' };

const swatch = (name, cssVar, value) => `
  <div style="display:grid;gap:var(--spacing-xs);font-size:var(--font-size-xs)">
    <div style="height:64px;border-radius:var(--radius-md);border:1px solid var(--line);background:var(--${cssVar})"></div>
    <strong>${name}</strong><code>--${cssVar}</code><span style="color:var(--text-muted)">${value}</span>
  </div>`;

export const SemanticColors = () => {
  const items = Object.entries(tokens.semantic.color).map(([name, d]) => {
    const [hue, step] = d.ref.replace('color.', '').split('.');
    return swatch(name, d.css, tokens.primitive.color[hue][step]);
  });
  return `<div style="display:grid;gap:var(--spacing-lg);grid-template-columns:repeat(auto-fill,minmax(140px,1fr))">${items.join('')}</div>`;
};

export const TextStyles = () => Object.keys(tokens['text-styles']).map(name =>
  `<p class="t-${name.replace('/', '-')}" style="margin-bottom:var(--spacing-lg)">${name} — 朝7時、焼きたてを。</p>`).join('');

export const Spacing = () => Object.entries(tokens.primitive.spacing).map(([k, v]) => `
  <div style="display:flex;align-items:center;gap:var(--spacing-md);margin-bottom:var(--spacing-sm);font-size:var(--font-size-xs)">
    <code style="width:9em">--spacing-${k}</code><span style="display:block;height:12px;width:var(--spacing-${k});background:var(--accent)"></span>${v}px
  </div>`).join('');
