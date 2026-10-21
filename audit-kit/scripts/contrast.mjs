#!/usr/bin/env node
/**
 * contrast — WCAG 2.2 contrast ratios, computed, never eyeballed. No dependencies.
 *
 *   node audit-kit/scripts/contrast.mjs '#1d1b19' '#f8ebda'
 *   node audit-kit/scripts/contrast.mjs --pairs pairs.json [--tokens tokens.css]
 *
 * pairs.json is a list of pairs to check. fg and bg can be hex values or
 * token names; token names are resolved from --tokens (a CSS file of custom
 * properties). Give a pair a "selector" to resolve its tokens inside a
 * mode or theme block (e.g. "[data-theme='dark']") — values in that block
 * override the base (:root / @theme) values.
 *
 *   [
 *     { "name": "body text on page", "fg": "--color-text-primary", "bg": "--color-surface-page", "kind": "text" },
 *     { "name": "focus ring on dark", "fg": "--color-focus", "bg": "--color-surface-page", "kind": "ui",
 *       "selector": "[data-theme='dark']" }
 *   ]
 *
 * kind: "text" (4.5:1, SC 1.4.3) · "large" (3:1, large text) · "ui" (3:1, SC 1.4.11)
 *
 * Limits: one block level of override (no nesting, no specificity). Values
 * with transparency are composited over the pair's bg only if bg is opaque.
 * Text over photos and gradients can't be checked this way — look at it.
 */

import { readFileSync } from 'node:fs';

const THRESHOLDS = { text: 4.5, large: 3, ui: 3 };

function parseHex(hex) {
  let h = hex.trim().replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(h)) return null;
  const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
}

function parseRgb(str) {
  const m = str.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)/i);
  if (!m) return null;
  const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return { r: +m[1] / 255, g: +m[2] / 255, b: +m[3] / 255, a };
}

const parseColour = (s) => (s.trim().startsWith('#') ? parseHex(s) : parseRgb(s));

const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

function composite(fg, bg) {
  if (fg.a >= 1) return fg;
  return { r: fg.a * fg.r + (1 - fg.a) * bg.r, g: fg.a * fg.g + (1 - fg.a) * bg.g, b: fg.a * fg.b + (1 - fg.a) * bg.b, a: 1 };
}

export function ratio(fgStr, bgStr) {
  const bg = parseColour(bgStr);
  const fg0 = parseColour(fgStr);
  if (!bg || !fg0) return null;
  if (bg.a < 1) return null; // unknown backdrop
  const fg = composite(fg0, bg);
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Minimal CSS block reader: selector -> { --prop: value }.
function readBlocks(css) {
  const blocks = {};
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim().replace(/\s+/g, ' ');
    const decls = blocks[selector] || (blocks[selector] = {});
    for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) decls[d[1]] = d[2].trim();
  }
  return blocks;
}

function resolver(blocks) {
  const base = Object.assign({}, ...Object.entries(blocks)
    .filter(([s]) => /^(:root|@theme|html)\b/.test(s) || s === ':root')
    .map(([, d]) => d));
  return (value, selector) => {
    const scope = { ...base, ...(selector ? blocks[selector] || {} : {}) };
    let v = value;
    for (let i = 0; i < 10 && v; i++) {
      if (v.startsWith('--')) v = scope[v];
      else if (/^var\(/.test(v)) v = scope[v.match(/var\(\s*(--[\w-]+)/)[1]];
      else break;
    }
    return v;
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 2 && !args[0].startsWith('--')) {
    const r = ratio(args[0], args[1]);
    if (r === null) { console.error('Could not read one of the colours.'); process.exit(2); }
    const v = r.toFixed(2);
    console.log(`${v}:1  text ${r >= 4.5 ? 'PASS' : 'FAIL'} · large/ui ${r >= 3 ? 'PASS' : 'FAIL'}`);
    return;
  }
  const get = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const pairsPath = get('--pairs');
  if (!pairsPath) { console.error('Usage: contrast.mjs <fg> <bg>  |  contrast.mjs --pairs pairs.json [--tokens tokens.css]'); process.exit(2); }
  const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
  const tokensPath = get('--tokens');
  const resolve = tokensPath ? resolver(readBlocks(readFileSync(tokensPath, 'utf8'))) : (v) => v;

  let failures = 0;
  const rows = [];
  for (const p of pairs) {
    const kind = p.kind || 'text';
    const fg = resolve(p.fg, p.selector);
    const bg = resolve(p.bg, p.selector);
    const r = fg && bg ? ratio(fg, bg) : null;
    const need = THRESHOLDS[kind];
    const status = r === null ? 'UNRESOLVED' : r >= need ? 'PASS' : 'FAIL';
    if (status !== 'PASS') failures++;
    rows.push([status, r === null ? '—' : `${r.toFixed(2)}:1`, `${need}:1`, p.name || `${p.fg} on ${p.bg}`, p.selector || 'base', fg || '?', bg || '?']);
  }
  console.log('| Status | Ratio | Needs | Pair | Scope | fg | bg |\n|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.join(' | ')} |`);
  console.log(`\n${pairs.length - failures} of ${pairs.length} pass.`);
  process.exitCode = failures ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
