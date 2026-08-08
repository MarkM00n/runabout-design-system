#!/usr/bin/env node
/**
 * generate-brand-overrides — reads scripts/data/northline-brand-tokens.json
 * (a resolved export of the Figma Semantic collection, both Primitives brand
 * modes x all three Semantic modes — see that file's `source` field for
 * provenance) and emits the CSS override blocks for the `data-brand`
 * attribute axis: [data-brand='northline'], its [data-mode='dark'] variant,
 * and its [data-mode='feature'] variant.
 *
 * Brand is independent of mode: Semantic tokens are the same names and the
 * same alias graph for every brand — only which Primitives mode (Runabout
 * vs Brand B — Northline) that graph resolves against changes the hex. So
 * "diff" here means: for a given Semantic mode, does Northline's resolved
 * value differ from Runabout's resolved value for this token? If not,
 * tokens.css's existing (Runabout) value already covers Northline and
 * emitting it again would be redundant, not wrong — this script leaves it
 * out so the generated block only contains what actually needs overriding.
 *
 * Runabout is never emitted: it's the value tokens.css already has with no
 * data-brand attribute at all, which is what "Runabout stays the default"
 * requires.
 *
 * Usage: node scripts/generate-brand-overrides.js [--write]
 *   (no flag)  Prints the generated CSS to stdout — a dry run, tokens.css
 *              is left untouched.
 *   --write    Splices the generated CSS into src/styles/tokens.css itself,
 *              between the START_MARKER/END_MARKER comments (see below),
 *              replacing whatever was there before. If the markers aren't
 *              present yet, they're appended to the end of the file. Safe
 *              to run repeatedly — each run replaces only the marked
 *              region, never anything outside it.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PATH = join(ROOT, 'scripts', 'data', 'northline-brand-tokens.json');
const TOKENS_CSS_PATH = join(ROOT, 'src', 'styles', 'tokens.css');

const START_MARKER = '/* BRAND OVERRIDES — GENERATED, DO NOT EDIT */';
const END_MARKER = '/* END BRAND OVERRIDES */';

// On Light's selector also explicitly matches [data-mode='light'], not just
// the bare [data-brand='northline'] — the same gap tokens.css's own header
// comment documents for why [data-mode='light'] exists despite duplicating
// @theme's values: custom properties don't reset themselves just because a
// new attribute value appears. Without the explicit pairing, a Northline
// element set back to data-mode="light" inside an ancestor carrying
// data-mode="dark"/"feature" would keep inheriting the darker values.
const MODE_CONFIG = [
  { dataKey: 'onLight', selector: "[data-brand='northline'], [data-brand='northline'][data-mode='light']" },
  { dataKey: 'onDark', selector: "[data-brand='northline'][data-mode='dark']" },
  { dataKey: 'onFeature', selector: "[data-brand='northline'][data-mode='feature']" },
];

// Semantic variable names come out of Figma as "category/name" (e.g.
// "text/primary"). tokens.css names the equivalent custom property
// --color-category-name for every COLOR token, or --opacity-category-name
// for the one FLOAT token (opacity/disabled) — matching the convention
// already used for every other semantic token in tokens.css's @theme block.
function cssVarName(semanticName, resolvedType) {
  const slug = semanticName.replace(/\//g, '-');
  const prefix = resolvedType === 'FLOAT' ? 'opacity' : 'color';
  return `--${prefix}-${slug}`;
}

function loadExport() {
  const raw = readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(raw);
}

// A token's resolvedType isn't stored in the merged export (it only kept
// final CSS-ready values), but opacity/disabled is the only non-COLOR
// Semantic token in this file (confirmed against the live Primitives/
// Semantic read) and it's also identical across brands in every mode, so it
// never actually reaches emitDiffBlock. Detected generically anyway (a
// bare number, not a color string) rather than hardcoded by name, so a
// future non-color Semantic token that *does* differ by brand is still
// named correctly instead of silently mis-emitted as a --color-* property.
function resolvedTypeOf(value) {
  return typeof value === 'number' ? 'FLOAT' : 'COLOR';
}

// Returns only the entries where northline's resolved value differs from
// runabout's for this mode — string-compared case-insensitively so e.g.
// "#DF8E10" vs "#df8e10" isn't reported as a false difference.
function diffMode(runaboutMode, northlineMode) {
  const diffs = [];
  for (const name of Object.keys(runaboutMode)) {
    const a = runaboutMode[name];
    const b = northlineMode[name];
    if (String(a).toLowerCase() !== String(b).toLowerCase()) {
      diffs.push({ name, value: b, resolvedType: resolvedTypeOf(b) });
    }
  }
  return diffs.sort((x, y) => x.name.localeCompare(y.name));
}

function renderBlock(selector, diffs) {
  const lines = diffs.map((d) => `  ${cssVarName(d.name, d.resolvedType)}: ${d.value};`);
  return `${selector} {\n${lines.join('\n')}\n}`;
}

function generate() {
  const data = loadExport();
  const { runabout, northline } = data.brands;

  const blocks = [];
  const summary = [];
  for (const { dataKey, selector } of MODE_CONFIG) {
    const diffs = diffMode(runabout[dataKey], northline[dataKey]);
    summary.push({ mode: dataKey, count: diffs.length });
    if (diffs.length > 0) blocks.push(renderBlock(selector, diffs));
  }

  const header = `/*
 * Northline brand overrides — generated by scripts/generate-brand-overrides.js
 * from scripts/data/northline-brand-tokens.json (resolved from the Figma
 * Primitives/Semantic variable collections, file ${data.source.figmaFileKey},
 * resolved ${data.source.resolvedAt}). Do not hand-edit: regenerate instead.
 *
 * Brand is a third, independent axis from mode — every semantic token name
 * is identical to the Runabout default; only the value differs. Runabout
 * itself carries no data-brand attribute and is unaffected by this file.
 *
 * Only tokens whose resolved value actually differs from Runabout's for the
 * same Semantic mode are listed below (${summary.map((s) => `${s.mode}: ${s.count}`).join(', ')}).
 */`;

  return { css: `${header}\n\n${blocks.join('\n\n')}\n`, summary };
}

// Splices `body` (the generated header + blocks, no markers) between
// START_MARKER and END_MARKER inside tokens.css's current contents,
// replacing whatever was there before. If the markers don't exist yet
// (first run), appends a new marked section to the end of the file instead
// of guessing where it belongs — this script only ever owns the content
// strictly between its own two markers, never anything else in tokens.css.
export function spliceIntoTokensCss(tokensCssSource, body) {
  const section = `${START_MARKER}\n\n${body}\n${END_MARKER}`;
  const markerRe = new RegExp(
    `${escapeRegExp(START_MARKER)}[\\s\\S]*?${escapeRegExp(END_MARKER)}`,
  );

  if (markerRe.test(tokensCssSource)) {
    return tokensCssSource.replace(markerRe, section);
  }

  const trimmed = tokensCssSource.replace(/\s+$/, '');
  return `${trimmed}\n\n${section}\n`;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const { css, summary } = generate();
const summaryLine = `Diff counts — ${summary.map((s) => `${s.mode}: ${s.count}`).join(', ')}`;

if (process.argv.includes('--write')) {
  const current = readFileSync(TOKENS_CSS_PATH, 'utf8');
  const updated = spliceIntoTokensCss(current, css);
  writeFileSync(TOKENS_CSS_PATH, updated);
  process.stderr.write(`${summaryLine}\nSpliced into ${TOKENS_CSS_PATH} between ${START_MARKER} / ${END_MARKER}\n`);
} else {
  process.stderr.write(`${summaryLine}\n(dry run — pass --write to splice this into tokens.css)\n`);
  process.stdout.write(css);
}
