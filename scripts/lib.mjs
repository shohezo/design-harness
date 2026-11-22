// 共通: 設定とトークンの読み込み
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const config = JSON.parse(readFileSync(resolve(root, 'harness.config.json'), 'utf8'));
export const at = p => resolve(root, p);
export const loadTokens = () => JSON.parse(readFileSync(at(config.tokens), 'utf8'));

// semantic の名前（例 "text/primary"）→ 実際の色（例 "#2B2219"）
export const resolveSemantic = (tokens, name) => {
  const def = tokens.semantic.color[name];
  if (!def) throw new Error(`semantic color が無い: ${name}`);
  return def.ref.replace(/^color\./, '').split('.').reduce((o, k) => o?.[k], tokens.primitive.color);
};
