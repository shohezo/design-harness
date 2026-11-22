// ハーネス「スクリーンショットで検証」: ビルドしたページを headless Chrome で開き、
// harness.config.json の viewports ごとに崩れ・抜けを検査して、スクリーンショットを .check/ に保存する。違反があれば exit 1。
//   エラー: 横スクロール、ビューポートからのはみ出し、h1 が 1 個でない、alt の無い img、ラベルの無いリンク・ボタン、
//           タグや属性が文字として表示されている、Web フォントが読み込めていない
//   警告:   文字が overflow で切れている可能性、SP でタップ領域が小さい
// 使い方: node scripts/check-pages.mjs [--no-build] [--url=https://example.com] [--widths=1024,768]
// 前提: Node 22 以上（WebSocket 内蔵）、Google Chrome（CHROME 環境変数でパスを変えられる）。外部ライブラリは使わない。
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { config, root, at } from './lib.mjs';

const arg = name => (process.argv.find(a => a.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const dist = at('ui/dist'), outDir = at('.check');
const CHROME = process.env.CHROME || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
const VIEWPORTS = [...config.viewports];
for (const w of arg('widths').split(',').map(Number).filter(Boolean)) VIEWPORTS.push({ name: `w${w}`, width: w, height: 900, mobile: w < 700 });

if (!process.argv.includes('--no-build') && !arg('url')) execFileSync('npx', ['vite', 'build', 'ui', '--logLevel', 'error'], { cwd: root, stdio: 'inherit' });
mkdirSync(outDir, { recursive: true });

// 静的サーバー（ui/dist → 無ければ ui/）
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = [join(dist, p), join(root, 'ui', p)].find(c => existsSync(c) && statSync(c).isFile());
  if (!f) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = arg('url') ? arg('url').replace(/\/$/, '') : `http://127.0.0.1:${server.address().port}`;

// Chrome（DevTools Protocol を WebSocket で直接話す）
const profile = mkdtempSync(join(tmpdir(), 'harness-check-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-sandbox', '--hide-scrollbars', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((ok, ng) => {
  let buf = ''; chrome.stderr.on('data', d => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) ok(m[1]); });
  chrome.on('error', () => ng(new Error(`Chrome を起動できない: ${CHROME}（CHROME 環境変数でパスを指定）`)));
  setTimeout(() => ng(new Error('Chrome の起動がタイムアウト')), 20000);
});
const port = new URL(wsUrl).port;
const target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => (ws.onopen = r));
let seq = 0; const pending = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.ng(new Error(m.error.message)) : p.ok(m.result); } };
const cdp = (method, params = {}) => new Promise((ok, ng) => { const id = ++seq; pending.set(id, { ok, ng }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression, awaitPromise = false) => {
  const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
await cdp('Page.enable'); await cdp('Runtime.enable');

// ページ内で実行する検査
const INSPECT = fonts => `(() => {
  const vw = innerWidth;
  const sel = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).join('.') : '');
  const vis = el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length > 0; };
  const clippedByAncestor = el => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).overflowX !== 'visible') return true; return false; };
  const out = { scrollW: document.scrollingElement.scrollWidth, h1: document.querySelectorAll('h1').length, imgNoAlt: [], emptyLinks: [], outOfViewport: [], clipped: [], smallTargets: [], leaked: [], fonts: {} };
  for (const f of ${JSON.stringify(fonts)}) {
    const used = [...document.querySelectorAll('body *')].some(e => getComputedStyle(e).fontFamily.includes(f.name) && e.textContent.trim());
    out.fonts[f.name] = { ok: f.check.every(c => document.fonts.check(c)), used, onlyIfUsed: !!f.onlyIfUsed };
  }
  for (const i of document.images) if (!i.hasAttribute('alt')) out.imgNoAlt.push(i.getAttribute('src'));
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let tn;
  while ((tn = tw.nextNode()) && out.leaked.length < 5) { if (/\\w+="[^"]*"\\s*>?|<\\/?\\w+>/.test(tn.nodeValue) && !/^(script|style|code|pre)$/i.test(tn.parentElement.tagName)) out.leaked.push(sel(tn.parentElement) + ' 「' + tn.nodeValue.trim().slice(0, 40) + '」'); }
  for (const a of document.querySelectorAll('a, button')) { if (!vis(a)) continue; if (!((a.textContent || '').trim() || a.getAttribute('aria-label') || a.querySelector('img[alt]:not([alt=""])'))) out.emptyLinks.push(sel(a)); }
  for (const el of document.body.querySelectorAll('*')) {
    if (!vis(el)) continue; const cs = getComputedStyle(el); if (cs.position === 'fixed') continue; const r = el.getBoundingClientRect();
    if (r.width > 0 && r.right > vw + 1 && !clippedByAncestor(el) && out.outOfViewport.length < 10) out.outOfViewport.push(sel(el) + ' right=' + Math.round(r.right));
    if (/(hidden|clip)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2 && el.textContent.trim() && !el.querySelector('img') && cs.webkitLineClamp === 'none' && out.clipped.length < 10) out.clipped.push(sel(el) + ' ' + el.clientHeight + '/' + el.scrollHeight);
    if (vw < 700 && /^(A|BUTTON)$/.test(el.tagName) && r.height < 24 && r.width < 24 && out.smallTargets.length < 10) out.smallTargets.push(sel(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  return out;
})()`;

const errors = [], warnings = [], report = {};
for (const page of config.pages) for (const vp of VIEWPORTS) {
  const tag = `${page.name}-${vp.name}`;
  await cdp('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
  await cdp('Page.navigate', { url: base + page.path });
  await evaluate(`new Promise(r => { const done = () => document.fonts.ready.then(() => r(true)); document.readyState === 'complete' ? done() : addEventListener('load', done); })`, true);
  await evaluate(`Promise.all([...document.images].map(i => { i.loading = 'eager'; return i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }); })).then(() => true)`, true);
  await sleep(300);
  const r = await evaluate(INSPECT(config.fonts));
  const h = await evaluate('document.documentElement.scrollHeight');
  const shot = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 80, captureBeyondViewport: true, clip: { x: 0, y: 0, width: vp.width, height: Math.min(h, 12000), scale: 1 } });
  writeFileSync(join(outDir, `${tag}.jpg`), Buffer.from(shot.data, 'base64'));
  report[tag] = r;

  if (r.scrollW > vp.width + 1) errors.push(`${tag}: 横スクロールが出る（scrollWidth ${r.scrollW} > ${vp.width}）`);
  for (const o of r.outOfViewport) errors.push(`${tag}: ビューポートからはみ出し ${o}`);
  if (r.h1 !== 1) errors.push(`${tag}: h1 が ${r.h1} 個（1 個にする）`);
  for (const i of r.imgNoAlt) errors.push(`${tag}: alt の無い img ${i}`);
  for (const l of r.emptyLinks) errors.push(`${tag}: ラベルの無いリンク／ボタン ${l}`);
  for (const m of r.leaked) errors.push(`${tag}: タグや属性が文字として表示されている ${m}`);
  for (const [name, f] of Object.entries(r.fonts)) if (!f.ok && (f.used || !f.onlyIfUsed)) errors.push(`${tag}: Web フォント ${name} が読み込めていない`);
  for (const c of r.clipped) warnings.push(`${tag}: 文字が切れている可能性 ${c}`);
  for (const t of r.smallTargets) warnings.push(`${tag}: タップ領域が小さい ${t}`);
  const fontsOk = Object.values(r.fonts).every(f => f.ok || (f.onlyIfUsed && !f.used));
  console.log(`${tag}: h1=${r.h1} scrollW=${r.scrollW}/${vp.width} fonts=${fontsOk ? 'ok' : 'NG'}`);
}
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 1));

ws.close(); server.close();
await new Promise(r => { chrome.on('exit', r); chrome.kill(); });
try { rmSync(profile, { recursive: true, force: true }); } catch { /* 後始末が遅いときは残す */ }
for (const w of warnings) console.log('warn: ' + w);
if (errors.length) { console.error(`\ncheck-pages: ${errors.length} 件の問題\n` + errors.map(e => '  - ' + e).join('\n')); process.exit(1); }
console.log('check-pages: ok（スクリーンショット → .check/）');
