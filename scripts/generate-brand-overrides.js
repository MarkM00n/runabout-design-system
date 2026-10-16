#!/usr/bin/env node
/**
 * generate-brand-overrides — derives every colour value in src/styles/tokens.css
 * and src/tokens/tokens.json from the latest Figma export
 * (src/tokens/figma-export-YYYY-MM-DD.json, a live Plugin API read of the
 * Primitives and Semantic collections). Nothing colour-related in those two
 * files is typed by hand any more; this script writes it.
 *
 * Two independent axes, both from Figma:
 *
 *   - Surface mode (Semantic collection): On Light / On Ink / On Dark /
 *     On Brand / On Accent / On Soft -> data-mode="light|ink|dark|brand|
 *     accent|soft". The mapping lives in the export's
 *     modes.surfaceDataMode, so a renamed mode is a one-place change.
 *   - Brand (Primitives collection): Runabout / Northline / Vines & Vinyl
 *     -> no attribute (Runabout) or data-brand="northline|vines-and-vinyl".
 *
 * Semantic tokens are brand-agnostic: the same names and the same alias
 * graph for every brand. A brand only changes which Primitives mode that
 * graph resolves against. So a brand in CSS is override blocks only — never
 * a new token name.
 *
 * What it writes:
 *
 *   1. @theme colour values — every --color-* semantic token's base value
 *      (its On Light resolution for Runabout) and every primitive step (its
 *      Runabout value). Values only: the per-token comments around them are
 *      human-written and left alone. A semantic token or primitive that
 *      exists in Figma but has no line in @theme is an error, not something
 *      this script invents — a new token needs a human-written comment
 *      saying what it is for, so add the line by hand and re-run.
 *   2. MODE OVERRIDES region — one [data-mode='…'] block per surface mode,
 *      listing every token whose Runabout value varies by mode. The light
 *      block exists even though it repeats @theme's base: @theme only sets
 *      the initial value, so a light card nested in a dark section needs an
 *      explicit rule to reset.
 *   3. BRAND OVERRIDES region — for each non-Runabout brand, one block per
 *      surface mode listing only the tokens whose resolved value differs
 *      from Runabout's in that same mode.
 *   4. tokens.json colour entries — values, per-mode values and aliases for
 *      semantic tokens; per-brand values for primitives. Notes are kept.
 *      Primitive groups that no longer exist in Figma are removed.
 *
 * Usage: node scripts/generate-brand-overrides.js [--write | --check]
 *   (no flag)  Dry run: prints a summary and the generated regions.
 *   --write    Writes tokens.css and tokens.json.
 *   --check    Exits 1 if either file differs from what --write would
 *              produce. Use in CI to catch hand edits.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS_DIR = join(ROOT, 'src', 'tokens');
const TOKENS_CSS_PATH = join(ROOT, 'src', 'styles', 'tokens.css');
const TOKENS_JSON_PATH = join(TOKENS_DIR, 'tokens.json');

const DEFAULT_BRAND = 'runabout';
const DEFAULT_MODE = 'light';

const BRAND_LABELS = {
  runabout: 'Runabout',
  northline: 'Northline',
  'vines-and-vinyl': 'Vines & Vinyl',
};

export const MODE_REGION = {
  start: '/* MODE OVERRIDES — GENERATED, DO NOT EDIT */',
  end: '/* END MODE OVERRIDES */',
};
export const BRAND_REGION = {
  start: '/* BRAND OVERRIDES — GENERATED, DO NOT EDIT */',
  end: '/* END BRAND OVERRIDES */',
};

// ---------------------------------------------------------------------------
// Export loading and value resolution
// ---------------------------------------------------------------------------

export function latestExportPath(dir = TOKENS_DIR) {
  const files = readdirSync(dir)
    .filter((f) => /^figma-export-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  if (files.length === 0) throw new Error(`No figma-export-YYYY-MM-DD.json in ${dir}`);
  return join(dir, files[files.length - 1]);
}

// Figma writes alpha colours as "#rrggbb@a". CSS gets rgba() for those and
// plain hex otherwise, matching what tokens.css has always used.
export function toCss(value) {
  const m = /^#([0-9a-f]{6})@([0-9.]+)$/i.exec(value);
  if (!m) return value.toLowerCase();
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Number(m[2])})`;
}

// "text/on-action" -> "text-on-action"
export const tokenSlug = (semanticName) => semanticName.replace(/\//g, '-');
// "Alpha/Scrim-85" -> "alpha-scrim-85"
export const primitiveSlug = (primitiveName) => primitiveName.replace(/\//g, '-').toLowerCase();

export function buildModel(exportData) {
  const surfaceModes = exportData.modes.surface; // Figma mode names, in order
  const dataMode = exportData.modes.surfaceDataMode; // Figma name -> data-mode
  const brands = exportData.modes.brand;
  const modes = surfaceModes.map((figmaName) => ({ figmaName, key: dataMode[figmaName] }));

  const colorTokens = Object.entries(exportData.semantic).filter(([, t]) => t.type !== 'FLOAT');

  // resolved[brand][modeKey][slug] = css value
  const resolved = {};
  for (const brand of brands) {
    resolved[brand] = {};
    for (const { figmaName, key } of modes) {
      resolved[brand][key] = {};
      for (const [name, token] of colorTokens) {
        const [alias] = token[figmaName];
        const primitive = exportData.primitives[alias];
        if (!primitive) throw new Error(`${name} (${figmaName}) aliases unknown primitive "${alias}"`);
        resolved[brand][key][tokenSlug(name)] = toCss(primitive[brand]);
      }
    }
  }

  // A token is "mode-variant" if it changes by mode for ANY brand, not just
  // Runabout. The mode blocks have to reset every such token: if a token
  // were constant across modes for Runabout but not for another brand, a
  // dark section inside that brand's light root would otherwise inherit the
  // brand's light value, because neither the Runabout dark block nor the
  // brand's dark block (which only lists differences from Runabout dark)
  // would mention it.
  const slugs = colorTokens.map(([name]) => tokenSlug(name));
  const modeVariant = slugs.filter((slug) =>
    brands.some((brand) => new Set(modes.map(({ key }) => resolved[brand][key][slug])).size > 1),
  );

  return { modes, brands, colorTokens, resolved, slugs, modeVariant };
}

// ---------------------------------------------------------------------------
// CSS generation
// ---------------------------------------------------------------------------

function block(selector, entries) {
  const lines = entries.map(([slug, value]) => `  --color-${slug}: ${value};`);
  return `${selector} {\n${lines.join('\n')}\n}`;
}

export function renderModeRegion(model, exportName) {
  const { modes, resolved, modeVariant } = model;
  const header = `/*
 * Mode overrides — generated by scripts/generate-brand-overrides.js from
 * src/tokens/${exportName}. Do not hand-edit: regenerate instead.
 *
 * An element carrying data-mode="${modes.map((m) => m.key).join('|')}" gets
 * these values instead of @theme's base for every mode-variant token.
 * Tailwind utilities read these custom properties at use time via
 * var(--color-*), so overriding the property is enough.
 *
 * Only the ${modeVariant.length} tokens that vary by mode (for any brand) appear here.
 * Mode-invariant tokens keep their @theme value everywhere.
 *
 * [data-mode='${DEFAULT_MODE}'] repeats @theme's base on purpose. @theme only sets
 * the *initial* value; a light card nested inside a dark section needs an
 * explicit rule to reset, because custom properties don't reset themselves
 * just because a new attribute value appears.
 *
 * Scope a data-mode override to the narrowest element that owns the
 * background, never the nearest convenient wrapper (CLAUDE.md, 2026-08-05).
 */`;
  const blocks = modes.map(({ key }) =>
    block(
      `[data-mode='${key}']`,
      modeVariant.map((slug) => [slug, resolved[DEFAULT_BRAND][key][slug]]),
    ),
  );
  return `${header}\n\n${blocks.join('\n\n')}\n`;
}

// Each brand × mode block gets TWO selector forms:
//
// 1. Same-element compound, [data-brand='x'][data-mode='dark'] — for an
//    element (usually the Storybook decorator root or an app shell) that
//    carries both attributes itself.
// 2. Descendant, [data-brand='x'] [data-mode='dark'] — for components that
//    set their own data-mode on their root without data-brand (Modal ->
//    light, Card/Producer -> dark). Without this form, such a component's
//    root matches Runabout's plain [data-mode='dark'] rule directly, and a
//    rule matching an element always beats a value inherited from an
//    ancestor — silently reverting every mode-variant token to Runabout
//    whatever brand is selected.
//
// Both forms carry two-attribute specificity, which beats Runabout's
// one-attribute [data-mode='…'] block. The light block also matches a brand
// root that has no mode of its own, so it gets its light values, and matches
// [data-mode='light'] explicitly for the same reset reason as the mode
// region.
//
// That brand-root form is [data-brand='x']:not([data-mode]), never the bare
// [data-brand='x']. The bare form has the same one-attribute specificity as
// [data-mode='dark'] and sits later in the file, so on an element carrying
// both attributes (the Storybook decorator does exactly this) the brand's
// light values beat Runabout's dark values for every token the brand's own
// dark block doesn't list. That shipped from 2026-09-07 to 2026-10-16 for
// Northline's secondary hover tint and subtle border, unnoticed;
// design-sync's brand check now emulates the cascade to catch it.
function brandSelector(brand, modeKey) {
  const b = `[data-brand='${brand}']`;
  const forms = [`${b}[data-mode='${modeKey}']`, `${b} [data-mode='${modeKey}']`];
  return modeKey === DEFAULT_MODE ? [`${b}:not([data-mode])`, ...forms].join(', ') : forms.join(', ');
}

export function renderBrandRegion(model, exportName) {
  const { modes, brands, resolved, slugs } = model;
  const sections = [];
  const summary = {};
  for (const brand of brands) {
    if (brand === DEFAULT_BRAND) continue;
    const counts = [];
    const blocks = [];
    for (const { key } of modes) {
      const diffs = slugs
        .filter((slug) => resolved[brand][key][slug] !== resolved[DEFAULT_BRAND][key][slug])
        .sort()
        .map((slug) => [slug, resolved[brand][key][slug]]);
      counts.push(`${key}: ${diffs.length}`);
      if (diffs.length) blocks.push(block(brandSelector(brand, key), diffs));
    }
    summary[brand] = counts.join(', ');
    sections.push(
      `/* ${BRAND_LABELS[brand] ?? brand} — data-brand="${brand}". Tokens differing from Runabout, per mode: ${summary[brand]}. */\n\n${blocks.join('\n\n')}`,
    );
  }
  const header = `/*
 * Brand overrides — generated by scripts/generate-brand-overrides.js from
 * src/tokens/${exportName}. Do not hand-edit: regenerate instead.
 *
 * Brand is an axis independent of mode. Every semantic token name is the
 * same for every brand; only the resolved value differs. Runabout carries no
 * data-brand attribute and is unaffected by this region. Each block lists
 * only the tokens whose value differs from Runabout's in the same mode.
 */`;
  return { css: `${header}\n\n${sections.join('\n\n')}\n`, summary };
}

export function spliceRegion(source, region, body) {
  const section = `${region.start}\n\n${body}\n${region.end}`;
  const re = new RegExp(`${escapeRegExp(region.start)}[\\s\\S]*?${escapeRegExp(region.end)}`);
  if (re.test(source)) return source.replace(re, section);
  return `${source.replace(/\s+$/, '')}\n\n${section}\n`;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Rewrites values of existing --color-* declarations inside @theme. Returns
// the new source plus the names it expected but could not find.
export function syncThemeValues(source, expected) {
  const start = source.indexOf('@theme');
  if (start === -1) throw new Error('tokens.css has no @theme block');
  let depth = 0;
  let open = -1;
  let close = -1;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') {
      if (depth === 0) open = i;
      depth++;
    } else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  let theme = source.slice(open, close);
  const missing = [];
  for (const [name, value] of Object.entries(expected)) {
    const re = new RegExp(`(--color-${escapeRegExp(name)}:\\s*)([^;]+)(;)`);
    if (!re.test(theme)) {
      missing.push(name);
      continue;
    }
    theme = theme.replace(re, `$1${value}$3`);
  }
  // Colour declarations in @theme that Figma no longer has.
  const declared = [...theme.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]);
  const orphaned = declared.filter((name) => !(name in expected));
  return { source: source.slice(0, open) + theme + source.slice(close), missing, orphaned };
}

// ---------------------------------------------------------------------------
// tokens.json
// ---------------------------------------------------------------------------

// tokens.json groups by the first path segment: "text/on-action" lives at
// color.text["on-action"], "Ink/850" at color.ink["850"].
function jsonPath(name) {
  const [group, ...rest] = name.split('/');
  return [group.toLowerCase(), rest.join('/').toLowerCase()];
}

export function syncTokensJson(json, exportData, model, exportName) {
  const out = structuredClone(json);
  const { modes, brands, resolved, modeVariant } = model;
  out.color = out.color ?? {};

  // Primitives — Runabout as "value", every other brand under its own key.
  const primitiveGroups = new Set();
  for (const [name, primitive] of Object.entries(exportData.primitives)) {
    const [group, step] = jsonPath(name);
    primitiveGroups.add(group);
    const entry = (out.color[group] ??= {})[step] ?? {};
    const next = { value: toCss(primitive[DEFAULT_BRAND]) };
    for (const brand of brands) if (brand !== DEFAULT_BRAND) next[brand] = toCss(primitive[brand]);
    if (entry.note) next.note = entry.note;
    else if (primitive.description) next.note = primitive.description;
    out.color[group][step] = next;
  }

  // Semantic.
  const semanticGroups = new Set();
  const semanticKeys = new Set();
  for (const [name, token] of model.colorTokens) {
    const slug = tokenSlug(name);
    const [group, key] = jsonPath(name);
    semanticGroups.add(group);
    semanticKeys.add(`${group}/${key}`);
    const entry = (out.color[group] ??= {})[key] ?? {};
    const next = { value: resolved[DEFAULT_BRAND][DEFAULT_MODE][slug] };
    if (modeVariant.includes(slug)) {
      next.modes = Object.fromEntries(
        modes.filter((m) => m.key !== DEFAULT_MODE).map((m) => [m.key, resolved[DEFAULT_BRAND][m.key][slug]]),
      );
    }
    next.alias = Object.fromEntries(modes.map((m) => [m.key, token[m.figmaName][0]]));
    next.note = entry.note ?? token.description;
    out.color[group][key] = next;
  }

  // Remove entries Figma no longer has: whole primitive groups (e.g. the
  // deleted Event/* group), and steps inside groups we own.
  for (const group of Object.keys(out.color)) {
    if (!primitiveGroups.has(group) && !semanticGroups.has(group)) delete out.color[group];
  }
  for (const group of primitiveGroups) {
    for (const step of Object.keys(out.color[group])) {
      const isPrimitive = Object.keys(exportData.primitives).some((n) => jsonPath(n).join('/') === `${group}/${step}`);
      const isSemantic = semanticKeys.has(`${group}/${step}`);
      if (!isPrimitive && !isSemantic) delete out.color[group][step];
    }
  }

  out.generatedFrom = `src/tokens/${exportName} — live Plugin API read of the Semantic (${model.colorTokens.length + 1} tokens x ${modes.length} surface modes) and Primitives (${Object.keys(exportData.primitives).length} steps x ${brands.length} brand modes) collections. Colour values are written by scripts/generate-brand-overrides.js, not transcribed.`;
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function generateAll() {
  const exportPath = latestExportPath();
  const exportName = exportPath.split('/').pop();
  const exportData = JSON.parse(readFileSync(exportPath, 'utf8'));
  const model = buildModel(exportData);

  const expectedTheme = {};
  for (const slug of model.slugs) expectedTheme[slug] = model.resolved[DEFAULT_BRAND][DEFAULT_MODE][slug];
  for (const [name, primitive] of Object.entries(exportData.primitives)) {
    expectedTheme[primitiveSlug(name)] = toCss(primitive[DEFAULT_BRAND]);
  }

  const cssBefore = readFileSync(TOKENS_CSS_PATH, 'utf8');
  const theme = syncThemeValues(cssBefore, expectedTheme);
  let css = spliceRegion(theme.source, MODE_REGION, renderModeRegion(model, exportName));
  const brand = renderBrandRegion(model, exportName);
  css = spliceRegion(css, BRAND_REGION, brand.css);

  const jsonBefore = readFileSync(TOKENS_JSON_PATH, 'utf8');
  const json = `${JSON.stringify(syncTokensJson(JSON.parse(jsonBefore), exportData, model, exportName), null, 2)}\n`;

  return { exportName, model, theme, brand, css, cssBefore, json, jsonBefore };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const { exportName, model, theme, brand, css, cssBefore, json, jsonBefore } = generateAll();
  const lines = [
    `Source: src/tokens/${exportName}`,
    `Semantic colour tokens: ${model.slugs.length} (${model.modeVariant.length} vary by mode)`,
    `Modes: ${model.modes.map((m) => `${m.figmaName} -> ${m.key}`).join(', ')}`,
    ...Object.entries(brand.summary).map(([b, s]) => `Brand ${b}: ${s}`),
  ];
  if (theme.missing.length) {
    lines.push(`ERROR — in Figma but missing from @theme (add each with a comment, then re-run): ${theme.missing.join(', ')}`);
  }
  if (theme.orphaned.length) {
    lines.push(`ERROR — in @theme but no longer in Figma (remove them): ${theme.orphaned.join(', ')}`);
  }
  process.stderr.write(`${lines.join('\n')}\n`);
  const broken = theme.missing.length > 0 || theme.orphaned.length > 0;

  if (process.argv.includes('--check')) {
    const stale = [];
    if (css !== cssBefore) stale.push('src/styles/tokens.css');
    if (json !== jsonBefore) stale.push('src/tokens/tokens.json');
    if (stale.length || broken) {
      process.stderr.write(`Out of date with the Figma export: ${stale.join(', ') || '@theme'}. Run npm run tokens:generate.\n`);
      process.exit(1);
    }
    process.stderr.write('tokens.css and tokens.json match the Figma export.\n');
  } else if (process.argv.includes('--write')) {
    if (broken) process.exit(1);
    writeFileSync(TOKENS_CSS_PATH, css);
    writeFileSync(TOKENS_JSON_PATH, json);
    process.stderr.write('Wrote src/styles/tokens.css and src/tokens/tokens.json.\n');
  } else {
    process.stdout.write(`${renderModeRegion(model, exportName)}\n${brand.css}`);
    if (broken) process.exit(1);
  }
}
