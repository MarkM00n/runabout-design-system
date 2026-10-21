#!/usr/bin/env node
/**
 * audit-code — a read-only, report-first scan of a codebase against its own
 * design tokens. No dependencies; Node 18+.
 *
 *   node audit-kit/scripts/audit-code.mjs --root <path/to/repo> --config <audit.config.json>
 *
 * It finds:
 *   - hardcoded colours, spacing, radius and type values, and says whether
 *     each one matches a token exactly (use the token), nearly (drift), or
 *     nothing (off-system);
 *   - token misuse: references to tokens that don't exist, tokens
 *     re-declared outside the token files, primitive tokens used directly in
 *     product code;
 *   - component drift: the same component defined in more than one place,
 *     local copies shadowing a design-system component, and how often each
 *     design-system component is actually imported;
 *   - a handful of accessibility smells that a static scan can see.
 *
 * It never edits anything. Output: a console summary, plus audit-report.json
 * and audit-summary.md in --out (default: ./audit-output).
 *
 * It is a heuristic, regex-based scan, not a parser or a renderer. It counts
 * what the source says, not what the browser computes. Treat every finding
 * as "worth a look", and confirm the important ones by rendering.
 *
 * Flags:
 *   --root <dir>      Repo to scan (default: cwd)
 *   --config <file>   Config file (default: <root>/audit.config.json if present)
 *   --out <dir>       Where reports go (default: ./audit-output)
 *   --fail-on <lvl>   Exit 1 if any finding at this level: fail | warn | never
 *                     (default: never — the audit reports, it doesn't block)
 */

import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, basename, extname, dirname, sep } from 'node:path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULTS = {
  roots: ['src'],
  include: ['.css', '.scss', '.sass', '.less', '.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte', '.html'],
  exclude: ['node_modules', 'dist', 'build', 'out', '.next', '.nuxt', 'coverage', 'storybook-static', '.git', 'vendor'],
  tokenFiles: { css: [], json: [] },
  tokenVarPrefixes: ['--color-', '--spacing-', '--space-', '--radius-', '--font-', '--text-', '--size-'],
  primitivePattern: null,
  componentDirs: [],
  designSystemPackages: [],
  surfaces: {},
  rootFontSize: 16,
  nearMissDistance: 10,
  justificationPattern: 'unbound|not tokeni[sz]ed|literal|exception|one-off|intentional',
  tailwind: { flagArbitraryValues: true, flagDefaultScale: false },
  topN: 15,
};

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { args[key] = next; i++; } else args[key] = true;
    }
  }
  return args;
}

function loadConfig(root, configPath) {
  const path = configPath ? resolve(configPath) : join(root, 'audit.config.json');
  let user = {};
  if (existsSync(path)) user = JSON.parse(readFileSync(path, 'utf8'));
  else if (configPath) throw new Error(`Config not found: ${path}`);
  const cfg = { ...DEFAULTS, ...user };
  cfg.tokenFiles = { ...DEFAULTS.tokenFiles, ...(user.tokenFiles || {}) };
  cfg.tailwind = { ...DEFAULTS.tailwind, ...(user.tailwind || {}) };
  const placeholders = [];
  const find = (v, path) => {
    if (typeof v === 'string' && /<[^>]+>/.test(v)) placeholders.push(`${path}: ${v}`);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!k.startsWith('$')) find(x, path ? `${path}.${k}` : k);
  };
  find(user, '');
  if (placeholders.length) throw new Error(`Config still has placeholders — replace them first:\n  ${placeholders.join('\n  ')}`);
  return { cfg, configPath: existsSync(path) ? path : null };
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

function walk(dir, cfg, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (cfg.exclude.includes(name)) continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, cfg, out);
    else if (cfg.include.includes(extname(name))) out.push(full);
  }
  return out;
}

// Blank out comments but keep newlines, so line numbers still line up.
function stripComments(src, ext) {
  let s = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  s = s.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  if (!['.css', '.html'].includes(ext)) {
    // `//` line comments, but not inside URLs (`https://`).
    s = s.replace(/(^|[^:"'`])\/\/[^\n]*/g, (m, p) => p + m.slice(p.length).replace(/[^\n]/g, ' '));
  }
  return s;
}

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

function hexToRgba(hex) {
  let h = hex.replace('#', '').toLowerCase();
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
  const n = (i) => parseInt(h.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? +(n(6) / 255).toFixed(3) : 1 };
}

function parseColour(str) {
  const s = str.trim().toLowerCase();
  if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(s)) return hexToRgba(s);
  const m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (m) {
    let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a: +a.toFixed(3) };
  }
  const h = s.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (h) {
    const [H, S, L] = [+h[1] / 360, +h[2] / 100, +h[3] / 100];
    const f = (n) => {
      const k = (n + H * 12) % 12;
      return Math.round(255 * (L - S * Math.min(L, 1 - L) * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    let a = h[4] === undefined ? 1 : h[4].endsWith('%') ? parseFloat(h[4]) / 100 : parseFloat(h[4]);
    return { r: f(0), g: f(8), b: f(4), a: +a.toFixed(3) };
  }
  return null;
}

const colourKey = (c) =>
  '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('') + (c.a < 1 ? `@${c.a}` : '');

const colourDistance = (a, b) => Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2) + Math.abs(a.a - b.a) * 255;

function toPx(str, rootFontSize) {
  const m = String(str).trim().match(/^(-?\d*\.?\d+)(px|rem|em)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (m[2] === 'rem' || m[2] === 'em') return +(n * rootFontSize).toFixed(2);
  return n;
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

function categoriseToken(name) {
  const n = name.toLowerCase();
  if (/radius|rounded|corner/.test(n)) return 'radius';
  if (/spacing|space|gap|inset|padding|margin|size/.test(n)) return 'spacing';
  if (/font|text|type|leading|line-height|letter|tracking|weight/.test(n)) return 'type';
  if (/color|colour|surface|bg|background|border|fill|ink/.test(n)) return 'colour';
  return 'other';
}

function loadTokens(root, cfg) {
  const tokens = []; // { name, value, category, colour?, px?, file }
  const add = (name, value, file) => {
    const v = String(value).trim();
    const colour = parseColour(v);
    const px = colour ? null : toPx(v, cfg.rootFontSize);
    let category = categoriseToken(name);
    if (colour) category = 'colour';
    tokens.push({ name, value: v, category, colour, px, file });
  };

  for (const rel of cfg.tokenFiles.css) {
    const file = join(root, rel);
    if (!existsSync(file)) { console.warn(`! token file not found: ${rel}`); continue; }
    const src = stripComments(readFileSync(file, 'utf8'), '.css');
    for (const m of src.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) add(m[1], m[2], rel);
  }

  for (const rel of cfg.tokenFiles.json) {
    const file = join(root, rel);
    if (!existsSync(file)) { console.warn(`! token file not found: ${rel}`); continue; }
    const data = JSON.parse(readFileSync(file, 'utf8'));
    const visit = (node, path) => {
      if (node === null || typeof node !== 'object') return;
      const val = node.$value ?? node.value;
      if (val !== undefined && typeof val !== 'object') {
        if (!/^\{.*\}$/.test(String(val))) add('--' + path.join('-'), val, rel); // skip aliases
        return;
      }
      for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) visit(v, [...path, k]);
    };
    visit(data, []);
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

const COLOUR_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?)\([^()]*\)/g;

const SPACING_PROPS = 'padding|margin|gap|row-gap|column-gap|inset|top|right|bottom|left|paddingTop|paddingRight|paddingBottom|paddingLeft|paddingInline|paddingBlock|marginTop|marginRight|marginBottom|marginLeft|marginInline|marginBlock|rowGap|columnGap|padding-[a-z-]+|margin-[a-z-]+';
const RADIUS_PROPS = 'border-radius|border-[a-z-]+-radius|borderRadius|border[A-Z][a-zA-Z]*Radius';
const TYPE_PROPS = 'font-size|line-height|letter-spacing|fontSize|lineHeight|letterSpacing';

const DECL_RE = (props) => new RegExp(`(?:^|[\\s{;,(])(${props})\\s*:\\s*([^;{}\\n,]+)`, 'g');

const TW_SPACING = 'p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|inset|inset-x|inset-y|top|right|bottom|left';
const TW_ARBITRARY = new RegExp(
  `(?<![\\w-])(-?)(${TW_SPACING}|rounded(?:-[a-z]{1,2})?|text|leading|tracking|font|bg|border(?:-[a-z])?|fill|stroke|ring|outline|from|via|to|shadow)-\\[([^\\]\\s]+)\\]`,
  'g',
);
const TW_DEFAULT_SCALE = new RegExp(`(?<![\\w-])(?:${TW_SPACING}|h|w|size|min-h|min-w|max-h|max-w)-(\\d+(?:\\.5)?)(?![\\w/.-])`, 'g');

function nearestTokens(list, predicate) {
  return list.filter(predicate).map((t) => t.name);
}

function classifyColour(raw, tokens, cfg) {
  const c = parseColour(raw);
  if (!c) return null;
  const colourTokens = tokens.filter((t) => t.colour);
  const exact = colourTokens.filter((t) => colourKey(t.colour) === colourKey(c));
  if (exact.length) return { kind: 'matches-token', tokens: exact.map((t) => t.name), key: colourKey(c) };
  let best = null;
  for (const t of colourTokens) {
    const d = colourDistance(c, t.colour);
    if (!best || d < best.d) best = { d, t };
  }
  if (best && best.d <= cfg.nearMissDistance) return { kind: 'near-miss', tokens: [best.t.name], distance: +best.d.toFixed(1), key: colourKey(c) };
  return { kind: 'off-system', tokens: [], key: colourKey(c) };
}

function classifyDimension(raw, category, tokens, cfg) {
  const values = raw.trim().split(/\s+/);
  const results = [];
  for (const v of values) {
    if (/var\(|calc\(|^auto$|^0(px|rem)?$|%$|^inherit|^initial|^unset|^normal$|vh$|vw$|^-?0$/.test(v)) continue;
    const px = toPx(v.replace(/['"]/g, ''), cfg.rootFontSize);
    if (px === null || px === 0) continue;
    const exact = tokens.filter((t) => t.px !== null && t.px === Math.abs(px) && t.category === category);
    results.push({ value: v.replace(/['"]/g, ''), px, kind: exact.length ? 'matches-token' : 'off-scale', tokens: exact.map((t) => t.name) });
  }
  return results;
}

function isJustified(origLines, lineIdx, cfg) {
  const ctx = origLines.slice(Math.max(0, lineIdx - 2), lineIdx + 1).join('\n');
  return new RegExp(cfg.justificationPattern, 'i').test(ctx) && /\/\/|\/\*|<!--/.test(ctx);
}

function scanFile(file, rel, src, ctx) {
  const { cfg, tokens, tokenNames, primitiveNames, findings, rawValues } = ctx;
  const ext = extname(file);
  const code = stripComments(src, ext);
  const origLines = src.split('\n');
  const isComponentFile = ctx.componentDirAbs.some((d) => file.startsWith(d + sep));
  const surface = surfaceOf(rel, cfg);

  const push = (f) => findings.push({ surface, file: rel, ...f });
  const tally = (category, key) => {
    const k = `${category}:${key}`;
    rawValues.set(k, (rawValues.get(k) || { category, value: key, count: 0, files: new Set() }));
    const e = rawValues.get(k); e.count++; e.files.add(rel);
  };

  // --- Colour literals -----------------------------------------------------
  for (const m of code.matchAll(COLOUR_RE)) {
    const line = lineOf(code, m.index);
    // Skip things that only look like hex: URL fragments, `#id` selectors in CSS.
    if (m[0].startsWith('#') && /[g-zG-Z]/.test(code[m.index + m[0].length] || '')) continue;
    if (ext === '.css' || ext === '.scss') {
      const before = code.slice(code.lastIndexOf('\n', m.index) + 1, m.index);
      if (!before.includes(':')) continue; // a selector like #fff-wrapper, not a value
    }
    const cls = classifyColour(m[0], tokens, cfg);
    if (!cls) continue;
    tally('colour', cls.key);
    const justified = isJustified(origLines, line - 1, cfg);
    const msg = {
      'matches-token': `Hardcoded colour ${m[0]} is exactly the value of ${cls.tokens.join(', ')}.`,
      'near-miss': `Hardcoded colour ${m[0]} is a near-miss for ${cls.tokens[0]} (distance ${cls.distance}) — likely drift.`,
      'off-system': `Hardcoded colour ${m[0]} matches no token.`,
    }[cls.kind];
    push({
      check: 'hardcoded-colour', kind: cls.kind, line, value: m[0],
      level: justified ? 'warn' : cls.kind === 'off-system' && tokens.length === 0 ? 'warn' : 'fail',
      message: msg + (justified ? ' (has a justifying comment)' : ''),
      fix: cls.kind === 'off-system' ? 'Find the intended token in the design file; if none exists, this is a system gap — record it, don\'t invent a token.' : `Use ${cls.tokens[0]}.`,
    });
  }

  // --- Spacing, radius, type declarations (CSS and JS style objects) -----
  const declChecks = [
    ['spacing', SPACING_PROPS, 'hardcoded-spacing'],
    ['radius', RADIUS_PROPS, 'hardcoded-radius'],
    ['type', TYPE_PROPS, 'hardcoded-type'],
  ];
  for (const [category, props, check] of declChecks) {
    for (const m of code.matchAll(DECL_RE(props))) {
      const raw = m[2].replace(/[,'"`}]+\s*$/, '').replace(/^['"`]/, '');
      if (/var\(|\$\{|theme\(|token/.test(raw)) continue;
      // Unitless line-height / letter-spacing are ratios, not lengths.
      if (/line-?height|letter-?spacing/i.test(m[1]) && /^\d*\.?\d+$/.test(raw.trim())) continue;
      // JS numbers in style objects: `padding: 12` means 12px in React.
      const vals = /^\d+(\.\d+)?$/.test(raw.trim()) && /\.(t|j)sx?$/.test(ext) ? `${raw.trim()}px` : raw;
      for (const r of classifyDimension(vals, category, tokens, cfg)) {
        const line = lineOf(code, m.index);
        tally(category, `${r.px}px`);
        push({
          check, kind: r.kind, line, value: `${m[1]}: ${r.value}`,
          level: isJustified(origLines, line - 1, cfg) ? 'warn' : r.kind === 'matches-token' ? 'fail' : 'warn',
          message: r.kind === 'matches-token'
            ? `Hardcoded ${category} ${r.value} equals ${r.tokens.join(', ')}.`
            : `Hardcoded ${category} ${r.value} (${r.px}px) is not on the token scale.`,
          fix: r.kind === 'matches-token' ? `Use ${r.tokens[0]}.` : 'Check the design file: snap to the nearest token, or record it as an unbound value.',
        });
      }
    }
  }

  // font-family literals
  for (const m of code.matchAll(/(?:font-family|fontFamily)\s*:\s*([^;{}\n]+)/g)) {
    if (/var\(|theme\(|\$\{|inherit/.test(m[1])) continue;
    const line = lineOf(code, m.index);
    tally('type', `font-family ${m[1].trim().slice(0, 40)}`);
    push({ check: 'hardcoded-type', kind: 'font-family', line, value: m[1].trim().slice(0, 60), level: 'warn',
      message: 'Font family set directly rather than from a type token or text style.', fix: 'Use the type token or text style for this role.' });
  }

  // --- Tailwind arbitrary values and default scale ------------------------
  if (cfg.tailwind.flagArbitraryValues && /\.(tsx|jsx|ts|js|vue|svelte|html)$/.test(ext)) {
    for (const m of code.matchAll(TW_ARBITRARY)) {
      const [, , util, inner] = m;
      if (/^var\(|^--/.test(inner)) continue; // arbitrary but token-backed
      const line = lineOf(code, m.index);
      const isColourUtil = /^(bg|border|fill|stroke|ring|outline|from|via|to|text|shadow)/.test(util) && parseColour(inner.replace(/_/g, ' '));
      if (isColourUtil) {
        const cls = classifyColour(inner.replace(/_/g, ' '), tokens, cfg);
        tally('colour', cls.key);
        push({ check: 'hardcoded-colour', kind: cls.kind, line, value: m[0], level: 'fail',
          message: `Arbitrary colour class ${m[0]} (${cls.kind}${cls.tokens.length ? ': ' + cls.tokens.join(', ') : ''}).`,
          fix: cls.tokens.length ? `Use the ${cls.tokens[0]} utility.` : 'Use a token utility.' });
        continue;
      }
      if (/^(bg|border|fill|stroke|ring|outline|from|via|to|shadow)/.test(util)) continue; // widths, gradients: not audited
      const category = /^rounded/.test(util) ? 'radius' : /^(text|leading|tracking|font)$/.test(util) ? 'type' : 'spacing';
      for (const r of classifyDimension(inner, category, tokens, cfg)) {
        tally(category, `${r.px}px`);
        push({ check: `hardcoded-${category}`, kind: r.kind, line, value: m[0],
          level: isJustified(origLines, line - 1, cfg) ? 'warn' : r.kind === 'matches-token' ? 'fail' : 'warn',
          message: r.kind === 'matches-token' ? `Arbitrary class ${m[0]} equals ${r.tokens.join(', ')}.` : `Arbitrary class ${m[0]} is off the token scale.`,
          fix: r.kind === 'matches-token' ? `Use the ${r.tokens[0]} utility.` : 'Snap to a token, or record it as an unbound value.' });
      }
    }
  }
  if (cfg.tailwind.flagDefaultScale && /\.(tsx|jsx|vue|svelte|html)$/.test(ext)) {
    for (const m of code.matchAll(TW_DEFAULT_SCALE)) {
      push({ check: 'framework-default-scale', kind: 'default-scale', line: lineOf(code, m.index), value: m[0], level: 'warn',
        message: `${m[0]} uses the framework's default scale, not the system's tokens.`, fix: 'Use a token utility or an exact value from the design.' });
    }
  }

  // --- Token misuse -------------------------------------------------------
  for (const m of code.matchAll(/var\(\s*(--[\w-]+)/g)) {
    const name = m[1];
    if (name.endsWith('-') || code.slice(m.index + m[0].length, m.index + m[0].length + 2) === '${') continue; // built at runtime
    if (!cfg.tokenVarPrefixes.some((p) => name.startsWith(p))) continue;
    if (tokenNames.size && !tokenNames.has(name) && !ctx.declaredElsewhere.has(name)) {
      push({ check: 'unknown-token', kind: 'undeclared', line: lineOf(code, m.index), value: name, level: 'fail',
        message: `${name} is not declared in any token file — retired, renamed or misspelled. It resolves to nothing, silently.`,
        fix: 'Find its current name in the token files.' });
    }
    if (isComponentFile || !primitiveNames.has(name)) continue;
    push({ check: 'primitive-in-product', kind: 'layer-bypass', line: lineOf(code, m.index), value: name, level: 'warn',
      message: `${name} is a primitive used directly in product code — it skips the semantic layer, so it won't follow themes or modes.`,
      fix: 'Use the semantic token for this role.' });
  }
  if (primitiveNames.size && /\.(tsx|jsx|vue|svelte|html)$/.test(ext) && !isComponentFile) {
    const suffixes = [...primitiveNames].map((n) => n.replace(/^--(color|colour)-/, '')).filter(Boolean);
    if (suffixes.length) {
      const re = new RegExp(`(?<![\\w-])(?:bg|text|border|fill|stroke|ring|outline|from|via|to|divide|placeholder|decoration)-(${suffixes.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\w-])`, 'g');
      for (const m of code.matchAll(re)) {
        push({ check: 'primitive-in-product', kind: 'layer-bypass', line: lineOf(code, m.index), value: m[0], level: 'warn',
          message: `${m[0]} applies a primitive palette step directly.`, fix: 'Use the semantic token for this role.' });
      }
    }
  }
  // Token-prefixed custom properties declared outside the token files.
  if (!ctx.tokenFileAbs.includes(file)) {
    for (const m of code.matchAll(/(?:^|[\s{;])(--[\w-]+)\s*:/g)) {
      if (!cfg.tokenVarPrefixes.some((p) => m[1].startsWith(p))) continue;
      push({ check: 'token-redeclared', kind: tokenNames.has(m[1]) ? 'overrides-token' : 'shadow-token', line: lineOf(code, m.index), value: m[1], level: 'warn',
        message: tokenNames.has(m[1]) ? `${m[1]} is overridden outside the token files.` : `${m[1]} looks like a token but is declared outside the token files — a shadow token.`,
        fix: 'Move it into the token files, or rename it so it is clearly local.' });
    }
  }

  // --- Accessibility smells (static, heuristic) ---------------------------
  if (/\.(tsx|jsx|vue|svelte|html)$/.test(ext)) {
    const a11y = [
      [/<(div|span)\b[^>]*\b(onClick|@click|on:click)\b/g, 'clickable-non-control', 'fail', 'A clickable div/span — not reachable by keyboard or announced as a control.', 'Use a <button> or <a>.'],
      [/<img\b(?![^>]*\balt=)[^>]*>/g, 'img-missing-alt', 'fail', 'Image with no alt attribute.', 'Add alt text, or alt="" if decorative.'],
      [/tabIndex=\{?["']?[1-9]/g, 'positive-tabindex', 'warn', 'Positive tabIndex reorders keyboard focus.', 'Use 0 or -1, and fix DOM order instead.'],
    ];
    for (const [re, kind, level, message, fix] of a11y) {
      for (const m of code.matchAll(re)) push({ check: 'accessibility', kind, line: lineOf(code, m.index), value: m[0].slice(0, 60), level, message, fix });
    }
    const svgs = [...code.matchAll(/<svg\b[^>]*>/g)];
    for (const m of svgs) {
      if (!/aria-hidden|aria-label|role=/.test(m[0])) {
        push({ check: 'accessibility', kind: 'svg-unlabelled', line: lineOf(code, m.index), value: '<svg>', level: 'warn',
          message: 'Inline SVG is neither hidden nor labelled.', fix: 'aria-hidden="true" if decorative; a label if it carries meaning.' });
      }
    }
  }
  const focusIdx = code.search(/(?<![\w-])focus:|:focus(?![-\w])/);
  if (focusIdx !== -1 && !/focus-visible/.test(code)) {
    push({ check: 'accessibility', kind: 'focus-not-focus-visible', line: lineOf(code, focusIdx), value: ':focus', level: 'warn',
      message: 'Focus styling uses :focus, which also fires on mouse click.', fix: 'Use :focus-visible.' });
  }
  const outlineNone = code.search(/outline-none|outline:\s*(none|0)\b/);
  if (outlineNone !== -1 && !/focus-visible/.test(code)) {
    push({ check: 'accessibility', kind: 'focus-removed', line: lineOf(code, outlineNone), value: 'outline: none', level: 'fail',
      message: 'Focus outline removed with no focus-visible replacement in this file.', fix: 'Provide a visible :focus-visible style.' });
  }

  // --- Component inventory -----------------------------------------------
  const base = basename(file, ext);
  if (/^[A-Z][A-Za-z0-9]+$/.test(base) && /\.(tsx|jsx|vue|svelte)$/.test(ext) && !/\.(stories|test|spec)$/.test(base)) {
    if (!['index', 'App'].includes(base)) {
      const list = ctx.definitions.get(base) || [];
      list.push({ file: rel, isDesignSystem: isComponentFile, surface });
      ctx.definitions.set(base, list);
    }
  }
  // Imports from the design system
  for (const m of code.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const from = m[2];
    const target = from.startsWith('.') ? resolve(dirname(file), from) : null;
    const isDs = cfg.designSystemPackages.some((p) => from === p || from.startsWith(p + '/'))
      || (target && ctx.componentDirAbs.some((d) => target === d || target.startsWith(d + sep)));
    if (!isDs || isComponentFile) continue;
    for (const name of m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter((s) => /^[A-Z]/.test(s))) {
      const e = ctx.usage.get(name) || { count: 0, surfaces: new Set() };
      e.count++; e.surfaces.add(surface);
      ctx.usage.set(name, e);
    }
  }
  // Native controls in product code (candidates for a system component)
  if (!isComponentFile && /\.(tsx|jsx|vue|svelte|html)$/.test(ext)) {
    for (const m of code.matchAll(/<(button|input|select|textarea|dialog)\b/g)) {
      const e = ctx.nativeControls.get(m[1]) || { count: 0, surfaces: new Set() };
      e.count++; e.surfaces.add(surface);
      ctx.nativeControls.set(m[1], e);
    }
  }
}

function surfaceOf(rel, cfg) {
  const norm = rel.split(sep).join('/');
  for (const [name, prefix] of Object.entries(cfg.surfaces)) if (norm.startsWith(prefix.replace(/\/$/, '') + '/')) return name;
  return norm.split('/').slice(0, 2).join('/');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv);
  const root = resolve(args.root || process.cwd());
  const { cfg, configPath } = loadConfig(root, args.config);
  const outDir = resolve(args.out || 'audit-output');
  const failOn = args['fail-on'] || 'never';

  const tokens = loadTokens(root, cfg);
  const tokenNames = new Set(tokens.map((t) => t.name));
  const primitiveRe = cfg.primitivePattern ? new RegExp(cfg.primitivePattern) : null;
  const primitiveNames = new Set(primitiveRe ? [...tokenNames].filter((n) => primitiveRe.test(n)) : []);
  const tokenFileAbs = [...cfg.tokenFiles.css, ...cfg.tokenFiles.json].map((p) => join(root, p));

  const files = cfg.roots.flatMap((r) => walk(join(root, r), cfg)).filter((f) => !tokenFileAbs.includes(f));

  // Custom properties declared anywhere in scanned CSS count as "declared"
  // for the unknown-token check (reported separately as token-redeclared).
  const declaredElsewhere = new Set();
  for (const f of files) {
    if (!/\.(css|scss|sass|less)$/.test(f)) continue;
    for (const m of readFileSync(f, 'utf8').matchAll(/(--[\w-]+)\s*:/g)) declaredElsewhere.add(m[1]);
  }

  const ctx = {
    cfg, tokens, tokenNames, primitiveNames, tokenFileAbs, declaredElsewhere,
    componentDirAbs: cfg.componentDirs.map((d) => join(root, d)),
    componentDirRel: cfg.componentDirs,
    findings: [], rawValues: new Map(), definitions: new Map(), usage: new Map(), nativeControls: new Map(),
  };

  for (const f of files) {
    let src;
    try { src = readFileSync(f, 'utf8'); } catch { continue; }
    if (src.length > 2_000_000) continue; // skip bundles
    scanFile(f, relative(root, f), src, ctx);
  }

  // Component drift: same name defined in more than one place.
  const dsNames = new Set([...ctx.definitions].filter(([, l]) => l.some((d) => d.isDesignSystem)).map(([n]) => n));
  for (const [name, list] of ctx.definitions) {
    if (list.length < 2) continue;
    const shadowsDs = dsNames.has(name);
    for (const d of list.filter((x) => !(shadowsDs && x.isDesignSystem))) {
      ctx.findings.push({
        surface: d.surface, file: d.file, line: 1, check: 'component-drift',
        kind: shadowsDs ? 'shadows-design-system' : 'duplicate-definition', value: name,
        level: shadowsDs ? 'fail' : 'warn',
        message: shadowsDs
          ? `A local ${name} shadows the design system's ${name}.`
          : `${name} is defined in ${list.length} places: ${list.map((x) => x.file).join(', ')}.`,
        fix: shadowsDs ? `Use the system ${name}; if it can't do what's needed, that's a gap to raise, not a fork.` : 'Pick one; retire the others.',
      });
    }
  }

  writeReports({ root, cfg, configPath, outDir, tokens, files, ctx, dsNames });

  const levels = { fail: 0, warn: 0 };
  ctx.findings.forEach((f) => (levels[f.level] = (levels[f.level] || 0) + 1));
  if (failOn === 'fail' && levels.fail) process.exit(1);
  if (failOn === 'warn' && (levels.fail || levels.warn)) process.exit(1);
}

function writeReports({ root, cfg, configPath, outDir, tokens, files, ctx, dsNames }) {
  const { findings } = ctx;
  const by = (keyFn) => findings.reduce((m, f) => { const k = keyFn(f); m[k] = m[k] || { fail: 0, warn: 0 }; m[k][f.level]++; return m; }, {});
  const byCheck = by((f) => `${f.check} · ${f.kind}`);
  const bySurface = by((f) => f.surface);
  const topValues = [...ctx.rawValues.values()].sort((a, b) => b.count - a.count).slice(0, cfg.topN)
    .map((v) => ({ category: v.category, value: v.value, count: v.count, files: v.files.size }));
  const topFiles = Object.entries(by((f) => f.file)).map(([file, c]) => ({ file, ...c, total: c.fail + c.warn }))
    .sort((a, b) => b.total - a.total).slice(0, cfg.topN);
  const usage = [...ctx.usage].map(([name, e]) => ({ name, imports: e.count, surfaces: e.surfaces.size }))
    .sort((a, b) => b.imports - a.imports);
  const unused = [...dsNames].filter((n) => !ctx.usage.has(n)).sort();
  const native = [...ctx.nativeControls].map(([el, e]) => ({ element: el, count: e.count, surfaces: e.surfaces.size }));
  const tokenCounts = tokens.reduce((m, t) => ((m[t.category] = (m[t.category] || 0) + 1), m), {});

  const report = {
    generatedAt: new Date().toISOString(),
    root: relative(process.cwd(), root) || '.',
    config: configPath ? relative(process.cwd(), configPath) : '(defaults)',
    scannedFiles: files.length,
    tokens: { total: tokens.length, byCategory: tokenCounts },
    totals: { fail: findings.filter((f) => f.level === 'fail').length, warn: findings.filter((f) => f.level === 'warn').length },
    byCheck, bySurface, topRepeatedRawValues: topValues, topFiles,
    components: { designSystemDefinitions: [...dsNames].sort(), importsFromDesignSystem: usage, neverImported: unused, nativeControlsInProductCode: native },
    findings,
    caveats: [
      'Static, regex-based scan: it reads source, not computed styles.',
      'Values built at runtime (template strings, theme functions, CSS-in-JS helpers) are not resolved.',
      'A "matches-token" finding is the cheapest fix; an "off-system" finding needs the design file to decide.',
    ],
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'audit-report.json'), JSON.stringify(report, null, 2));

  const table = (rows, cols) => [
    `| ${cols.join(' | ')} |`, `|${cols.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');

  const md = [
    `# Code audit — summary`, '',
    `Generated ${report.generatedAt}. ${files.length} files scanned, ${tokens.length} tokens loaded.`, '',
    `**${report.totals.fail} fail · ${report.totals.warn} warn.** Report-only: nothing was changed.`, '',
    `## By check`, '',
    table(Object.entries(byCheck).sort((a, b) => b[1].fail + b[1].warn - (a[1].fail + a[1].warn)).map(([k, v]) => [k, v.fail, v.warn]), ['Check · kind', 'Fail', 'Warn']), '',
    `## By surface`, '',
    table(Object.entries(bySurface).sort((a, b) => b[1].fail + b[1].warn - (a[1].fail + a[1].warn)).map(([k, v]) => [k, v.fail, v.warn]), ['Surface', 'Fail', 'Warn']), '',
    `## Most repeated raw values (token candidates)`, '',
    table(topValues.map((v) => [v.category, `\`${v.value}\``, v.count, v.files]), ['Category', 'Value', 'Uses', 'Files']), '',
    `## Files with the most findings`, '',
    table(topFiles.map((f) => [`\`${f.file}\``, f.fail, f.warn]), ['File', 'Fail', 'Warn']), '',
    `## Design-system components`, '',
    usage.length ? table(usage.map((u) => [u.name, u.imports, u.surfaces]), ['Component', 'Imports', 'Surfaces']) : '_No design-system imports found — check `designSystemPackages` / `componentDirs` in the config._', '',
    unused.length ? `Never imported outside the system: ${unused.join(', ')}.` : '', '',
    native.length ? `Native controls in product code: ${native.map((n) => `\`<${n.element}>\` ×${n.count}`).join(', ')}.` : '', '',
    `## Caveats`, '', ...report.caveats.map((c) => `- ${c}`), '',
  ].join('\n');
  writeFileSync(join(outDir, 'audit-summary.md'), md);

  // Console
  console.log(`\nDesign system code audit — ${files.length} files, ${tokens.length} tokens`);
  if (!tokens.length) console.log('! No tokens loaded: every colour will read as "off-system". Set tokenFiles in the config.');
  console.log(`${report.totals.fail} fail · ${report.totals.warn} warn\n`);
  for (const [k, v] of Object.entries(byCheck).sort((a, b) => b[1].fail + b[1].warn - (a[1].fail + a[1].warn))) {
    console.log(`  ${k.padEnd(48, '.')} ${String(v.fail).padStart(5)} fail ${String(v.warn).padStart(5)} warn`);
  }
  console.log(`\nReports: ${relative(process.cwd(), join(outDir, 'audit-summary.md'))}, audit-report.json`);
}

try {
  main();
} catch (err) {
  console.error(`audit-code: ${err.message}`);
  process.exit(2);
}
