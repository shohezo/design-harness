// ハーネス「ルールで検証」: トークン準拠とコントラストを機械的に検査する。違反があれば exit 1。
//   0) tokens.css が tokens.json から再生成した結果と一致するか（古ければ再生成して警告）
//   1) styles/*.css に色・フォント・文字サイズ・太さの直値が無いか（var(--…) 以外を禁止）
//   2) CSS コメントの開閉の数が合っているか（閉じ忘れると以降のルールが丸ごと消える）
//   3) CSS で使っている var(--…) がすべて定義済みか
//   4) harness.config.json の contrast に書いた組み合わせが WCAG 2.x の比を満たすか
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { config, at, loadTokens, resolveSemantic } from './lib.mjs';

const tokens = loadTokens();
const errors = [], warnings = [];

// 0) 鮮度
const cssPath = at(config.tokensCss);
const before = (() => { try { return readFileSync(cssPath, 'utf8'); } catch { return ''; } })();
execFileSync(process.execPath, [at('scripts/build-tokens.mjs'), '--quiet']);
if (readFileSync(cssPath, 'utf8') !== before) warnings.push('tokens.css が古かったので再生成した（コミットすること）');

// 1) 直値
const dir = at(config.styles);
const files = readdirSync(dir).filter(f => f.endsWith('.css'));
const COLOR_PROPS = /^(color|background|background-color|border(-(top|right|bottom|left))?(-color)?|outline(-color)?|box-shadow|text-shadow|fill|stroke|text-decoration-color|caret-color|accent-color)$/;
const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|oklch|lab|lch)\(|(?<![-\w])(white|black|red|blue|green|gray|grey|orange|yellow|purple)(?![-\w(])/i;
for (const f of files) {
  readFileSync(join(dir, f), 'utf8').split('\n').forEach((line, i) => {
    if (/^\s*\/\*/.test(line)) return;
    const where = `${config.styles}/${f}:${i + 1}`;
    for (const d of line.replace(/^[^{]*\{/, '').split(';')) {
      const [prop, ...rest] = d.split(':'); const value = rest.join(':').replace(/\}\s*$/, '').trim();
      if (!prop || !value) continue;
      const p = prop.trim();
      const bare = value.replace(/var\([^)]*\)/g, '').replace(/url\([^)]*\)/g, '');
      if (COLOR_PROPS.test(p) && COLOR_LITERAL.test(bare)) errors.push(`${where}: 色の直値 → ${p}: ${value}`);
      if (p === 'font-family' && !value.startsWith('var(') && value !== 'inherit') errors.push(`${where}: font-family の直値 → ${value}`);
      if (p === 'font-size' && /[0-9.]+(px|rem|em|pt)\b/.test(bare) && !/clamp\(/.test(value)) errors.push(`${where}: font-size の直値 → ${value}`);
      if (p === 'font-weight' && /^[0-9]{3}$/.test(value)) errors.push(`${where}: font-weight の数値直値 → ${value}`);
    }
  });
}

// 2) コメントの開閉
for (const f of files) {
  const css = readFileSync(join(dir, f), 'utf8');
  const open = (css.match(/\/\*/g) || []).length, close = (css.match(/\*\//g) || []).length;
  if (open !== close) errors.push(`${config.styles}/${f}: コメントの開閉が不一致（/* ${open} 個、*/ ${close} 個）`);
}

// 3) 未定義の var(--…)
const defined = new Set([...readFileSync(cssPath, 'utf8').matchAll(/--([\w-]+)\s*:/g)].map(m => m[1]));
for (const f of files) for (const m of readFileSync(join(dir, f), 'utf8').matchAll(/--([\w-]+)\s*:/g)) defined.add(m[1]);
for (const v of config.allowUndefinedVars || []) defined.add(v);
for (const f of files) for (const m of readFileSync(join(dir, f), 'utf8').matchAll(/var\(--([\w-]+)/g)) {
  if (!defined.has(m[1])) errors.push(`${config.styles}/${f}: 未定義のトークン var(--${m[1]})`);
}

// 4) コントラスト（WCAG 2.x の相対輝度）
const rgb = h => { const n = h.replace('#', ''); const v = n.length === 3 ? [...n].map(c => c + c).join('') : n; return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255); };
const lum = c => { const [r, g, b] = rgb(c).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
console.log('check-tokens: コントラスト');
for (const [fg, bg, need, use] of config.contrast) {
  const r = ratio(resolveSemantic(tokens, fg), resolveSemantic(tokens, bg));
  const ok = r >= need;
  console.log(`  ${r.toFixed(2).padStart(5)} ${ok ? 'ok' : 'NG'}  ${use}（${fg} on ${bg}、必要 ${need}）`);
  if (!ok) errors.push(`コントラスト不足 ${use}: ${fg} on ${bg} = ${r.toFixed(2)}（必要 ${need}）`);
}

for (const w of warnings) console.log('warn: ' + w);
if (errors.length) { console.error(`\ncheck-tokens: ${errors.length} 件の違反\n` + errors.map(e => '  - ' + e).join('\n')); process.exit(1); }
console.log(`check-tokens: ok（${files.length} ファイル、直値なし・未定義なし・コントラスト ${config.contrast.length} 組）`);
