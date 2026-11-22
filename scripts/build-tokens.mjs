// tokens.json → tokens.css（CSS カスタムプロパティ）を 1 方向で書き出す。
// tokens.css は生成物。直接編集しない（check:tokens が鮮度を検査する）。
import { writeFileSync } from 'node:fs';
import { config, at, loadTokens, resolveSemantic } from './lib.mjs';

const t = loadTokens();
const p = t.primitive;
const L = [];
const push = (name, value) => L.push(`  --${name}: ${value};`);

L.push('/* 自動生成: scripts/build-tokens.mjs が tokens.json から生成。直接編集しない。 */');
L.push(':root {');
L.push('  /* primitive */');
for (const [hue, steps] of Object.entries(p.color)) for (const [k, v] of Object.entries(steps)) push(`color-${hue}-${k}`, v.toLowerCase());
for (const [k, v] of Object.entries(p.spacing)) push(`spacing-${k}`, `${v}px`);
for (const [k, v] of Object.entries(p.radius)) push(`radius-${k}`, `${v}px`);
for (const [k, v] of Object.entries(p.size)) push(`size-${k}`, `${v.pc}px`);
for (const [k, v] of Object.entries(p['font-size'])) push(`font-size-${k}`, `${v.pc}px`);
for (const [k, v] of Object.entries(p['line-height'])) push(`lh-${k}`, v);
for (const [k, v] of Object.entries(p['font-weight'])) push(`fw-${k}`, v);
for (const [k, v] of Object.entries(p['font-family'])) push(`font-${k}`, v);
for (const [k, v] of Object.entries(p.shadow)) push(`shadow-${k}`, v);
L.push('  /* semantic（部品の CSS はこちらを使う） */');
for (const [name, def] of Object.entries(t.semantic.color)) {
  const [hue, step] = def.ref.replace(/^color\./, '').split('.');
  resolveSemantic(t, name); // 参照切れはここで落とす
  push(def.css, `var(--color-${hue}-${step})`);
}
L.push('}');
L.push('');
L.push(`/* SP（${config.spBreakpoint}px 以下）: 文字サイズとサイズだけを上書きする。部品側で media query を使って文字サイズを変えない */`);
L.push(`@media (max-width: ${config.spBreakpoint}px) {`);
L.push('  :root {');
for (const [k, v] of Object.entries(p['font-size'])) if (v.sp !== v.pc) push(`font-size-${k}`, `${v.sp}px`);
for (const [k, v] of Object.entries(p.size)) if (v.sp !== v.pc) push(`size-${k}`, `${v.sp}px`);
L.push('  }');
L.push('}');
L.push('');
L.push('/* テキストスタイル（Figma の Text Styles と同名のユーティリティ） */');
for (const [name, s] of Object.entries(t['text-styles'])) {
  const decl = [`font-size: var(--font-size-${s.size})`, `font-weight: var(--fw-${s.weight})`, `line-height: var(--lh-${s.lh})`];
  if (s.family) decl.push(`font-family: var(--font-${s.family})`);
  if (s.ls) decl.push(`letter-spacing: ${s.ls}`);
  L.push(`.t-${name.replace('/', '-')} { ${decl.join('; ')}; }`);
}
writeFileSync(at(config.tokensCss), L.join('\n') + '\n');
if (!process.argv.includes('--quiet')) console.log(`tokens: ${config.tokensCss} を生成（${L.length} 行）`);
