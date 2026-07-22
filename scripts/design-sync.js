#!/usr/bin/env node
/**
 * design-sync — validates src/components/ against docs/design-system-rules.md
 * and now also generates and validates per-component documentation, per the
 * DesignOps pipeline: Figma -> Component Generation -> design-sync
 * Validation -> Documentation Generation -> Storybook -> Prototype.
 *
 * Pipeline steps on every run:
 *   1. Validate component   (token compliance, accessibility, Storybook coverage)
 *   2. Validate documentation
 *   3. Generate missing documentation sections (writes a ComponentName.docs.ts
 *      stub — with auto-derived variants/states — for any component missing one)
 *   4. Regenerate Storybook docs (npm run build-storybook, to confirm the
 *      current + newly-generated content actually builds)
 *   5. Report PASS / FAIL
 *
 * Deliberately does NOT attempt design-parity checks (comparing rendered
 * output against Figma) — that requires a live render + the Figma MCP tools
 * and is an LLM-driven process, not something a static script can do. See
 * prompts/validate-component.md for that half of the picture.
 *
 * Usage: npm run design-sync
 * Exit code: 0 if everything passes, 1 if anything fails.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS_DIR = join(ROOT, 'src', 'components');
const TOKENS_CSS_PATH = join(ROOT, 'src', 'styles', 'tokens.css');
const TOKENS_JSON_PATH = join(ROOT, 'src', 'tokens', 'tokens.json');
const DESIGN_RULES_PATH = join(ROOT, 'docs', 'design-system-rules.md');

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

export function discoverComponents() {
  if (!existsSync(COMPONENTS_DIR)) return [];
  return readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(COMPONENTS_DIR, name, `${name}.tsx`)))
    .sort();
}

// ---------------------------------------------------------------------------
// Token parity: tokens.css @theme vs. tokens.json, cross-checked (repo-level,
// not per-component — see docs/design-system-rules.md § Token compliance,
// "New tokens go in both files, kept in sync").
// ---------------------------------------------------------------------------

export function parseThemeTokenNames(css) {
  const names = new Set();
  const re = /--([a-z0-9-]+)\s*:/gi;
  let match;
  while ((match = re.exec(css))) {
    names.add(match[1]);
  }
  return names;
}

function flattenJsonCategory(obj, category) {
  const flat = new Set();
  for (const [key, val] of Object.entries(obj[category] ?? {})) {
    if (val && typeof val === 'object' && 'value' in val) {
      flat.add(`${category}-${key}`);
    } else if (val && typeof val === 'object') {
      for (const subKey of Object.keys(val)) {
        flat.add(`${category}-${key}-${subKey}`);
      }
    }
  }
  return flat;
}

function checkTokenParity() {
  const issues = [];
  const cssRaw = existsSync(TOKENS_CSS_PATH) ? readFileSync(TOKENS_CSS_PATH, 'utf8') : '';
  const jsonRaw = existsSync(TOKENS_JSON_PATH) ? readFileSync(TOKENS_JSON_PATH, 'utf8') : '';

  if (!cssRaw.trim()) {
    issues.push({ level: 'fail', message: 'src/styles/tokens.css is missing or empty.' });
  }
  if (!jsonRaw.trim()) {
    issues.push({ level: 'fail', message: 'src/tokens/tokens.json is missing or empty.' });
  }
  if (!cssRaw.trim() || !jsonRaw.trim()) return issues;

  const cssNames = parseThemeTokenNames(cssRaw);
  let json;
  try {
    json = JSON.parse(jsonRaw);
  } catch (err) {
    issues.push({ level: 'fail', message: `tokens.json failed to parse: ${err.message}` });
    return issues;
  }

  const cssColor = [...cssNames].filter((n) => n.startsWith('color-')).map((n) => n.slice('color-'.length));
  const cssSpacing = [...cssNames].filter((n) => n.startsWith('spacing-')).map((n) => n.slice('spacing-'.length));
  const cssRadius = [...cssNames].filter((n) => n.startsWith('radius-')).map((n) => n.slice('radius-'.length));
  const cssDuration = [...cssNames].filter((n) => n.startsWith('duration-')).map((n) => n.slice('duration-'.length));
  const cssEasing = [...cssNames].filter((n) => n.startsWith('ease-')).map((n) => n.slice('ease-'.length));
  const cssBreakpoint = [...cssNames].filter((n) => n.startsWith('breakpoint-')).map((n) => n.slice('breakpoint-'.length));

  const jsonColor = flattenJsonCategory(json, 'color');
  const jsonSpacing = new Set(Object.keys(json.spacing ?? {}));
  const jsonRadius = new Set(Object.keys(json.radius ?? {}));
  const jsonMotion = new Set(Object.keys(json.motion ?? {}));
  const jsonBreakpoint = new Set(Object.keys(json.breakpoint ?? {}));

  for (const name of cssColor) {
    if (!jsonColor.has(`color-${name}`)) {
      issues.push({ level: 'warn', message: `Color token "--color-${name}" is in tokens.css but has no matching entry in tokens.json.` });
    }
  }
  for (const name of cssSpacing) {
    if (!jsonSpacing.has(name)) {
      issues.push({ level: 'warn', message: `Spacing token "--spacing-${name}" is in tokens.css but has no matching entry in tokens.json.` });
    }
  }
  for (const name of cssRadius) {
    if (!jsonRadius.has(name)) {
      issues.push({ level: 'warn', message: `Radius token "--radius-${name}" is in tokens.css but has no matching entry in tokens.json.` });
    }
  }
  for (const name of cssDuration) {
    if (!jsonMotion.has(name)) {
      issues.push({ level: 'warn', message: `Motion token "--duration-${name}" is in tokens.css but has no matching entry in tokens.json.motion.` });
    }
  }
  for (const name of cssEasing) {
    if (!jsonMotion.has(name)) {
      issues.push({ level: 'warn', message: `Motion token "--ease-${name}" is in tokens.css but has no matching entry in tokens.json.motion.` });
    }
  }
  for (const name of cssBreakpoint) {
    if (!jsonBreakpoint.has(name)) {
      issues.push({ level: 'warn', message: `Breakpoint token "--breakpoint-${name}" is in tokens.css but has no matching entry in tokens.json.breakpoint.` });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 1a. Token compliance (per component)
// ---------------------------------------------------------------------------

// This repo's root font-size is 18px (see src/index.css), so Tailwind's
// default rem-based numeric scale renders 1.125x too large. This exact class
// of bug has shipped twice already (Button's height/radius, then
// independently on Checkbox's box and Select's chevron) — see
// docs/design-system-rules.md.
//
// The digit group requires a non-zero leading digit ([1-9]\d*) rather than
// bare \d+ — this repo's custom spacing tokens are deliberately zero-padded
// (spacing-00/01/02/03) specifically so they never collide with Tailwind's
// real scale, which never zero-pads. Matching \d+ here would flag every
// legitimate px-03/gap-01 usage as if it were the dangerous default scale.
//
// Tailwind's border-radius scale is named (rounded-xl, rounded-full), not
// numeric, so it's intentionally not in this list — there's no bare-number
// rounded-N utility to fall into this trap.
//
// The trailing (?!\/) excludes Tailwind's fraction-based positioning
// utilities (top-1/2, w-1/3, etc.) — those compute as percentages of the
// containing block and aren't rem-based at all, so they're not affected by
// the root-font-size bug. Without this, "top-1/2" (used to vertically
// center Select's chevron icon) matches as if it were the bare "top-1"
// spacing utility — a false positive caught by running this script against
// real merged code rather than trusting it after only testing it in
// isolation.
const DANGEROUS_SCALE_RE =
  /\b(?:h|w|gap|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|top|right|bottom|left|inset)-([1-9]\d*)\b(?!\/)/g;
const RAW_HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const DOC_COMMENT_KEYWORDS = /unbound|not bound|literal|not tokeni[sz]ed|raw (?:value|hex|color|px)/i;

// Blanks out comment contents (keeping newlines, so line numbers reported to
// the user still line up with the original file) so that mentioning a
// dangerous class name or a hex value *inside a comment* doesn't get flagged
// as if it were real usage. Regex-based approximation, not a full parser.
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));
}

// Converts a character index into a 1-based line number so issues can point
// at "where" in the file, not just describe "what" — index-based checks
// (matchAll/search) feed this directly; per-line loops already have the
// line number for free and don't need it.
function lineOf(source, index) {
  if (index == null || index < 0) return null;
  return source.slice(0, index).split('\n').length;
}

export function checkTokenCompliance(name, source) {
  const issues = [];
  const file = `src/components/${name}/${name}.tsx`;
  const codeOnly = stripComments(source);

  DANGEROUS_SCALE_RE.lastIndex = 0;
  let match;
  while ((match = DANGEROUS_SCALE_RE.exec(codeOnly))) {
    issues.push({
      level: 'fail',
      file,
      line: lineOf(codeOnly, match.index),
      code: `dangerous-scale:${match[0]}`,
      message: "This element's size doesn't quite match the design — it renders about 12.5% larger than intended.",
      fix: 'Use an exact pixel size or a design token here instead of the default sizing, so it matches the design exactly.',
    });
  }

  const hasFileLevelJustification = DOC_COMMENT_KEYWORDS.test(
    (source.match(/\/\*\*?[\s\S]*?\*\//g) ?? []).join('\n'),
  );

  const codeLines = codeOnly.split('\n');
  const originalLines = source.split('\n');
  codeLines.forEach((line, i) => {
    RAW_HEX_RE.lastIndex = 0;
    let hexMatch;
    while ((hexMatch = RAW_HEX_RE.exec(line))) {
      const nearbyContext = originalLines.slice(Math.max(0, i - 2), i + 1).join('\n');
      const hasNearbyComment = /\/\/|\/\*/.test(nearbyContext);
      if (hasNearbyComment) {
        issues.push({
          level: 'warn',
          file,
          line: i + 1,
          code: `raw-hex:${hexMatch[0]}:${i + 1}`,
          message: `This colour (${hexMatch[0]}) isn't from the design system. There's a note next to it, but it's worth double-checking the note actually explains why this exact colour is needed.`,
          fix: 'Check the nearby note really does explain why this one-off colour is needed, not just what it does.',
        });
      } else if (hasFileLevelJustification) {
        issues.push({
          level: 'warn',
          file,
          line: i + 1,
          code: `raw-hex:${hexMatch[0]}:${i + 1}`,
          message: `This colour (${hexMatch[0]}) isn't from the design system. The file explains why one-off colours are allowed here, but this line doesn't say why it needs one.`,
          fix: 'Add a short note on this line explaining why a one-off colour is needed — so the exception is on the record.',
        });
      } else {
        issues.push({
          level: 'fail',
          file,
          line: i + 1,
          code: `raw-hex:${hexMatch[0]}:${i + 1}`,
          message: `This colour (${hexMatch[0]}) isn't from the design system, and nothing explains why it's needed here.`,
          fix: 'Use a design system colour instead — check the design file for the right one. If this exact colour really is a one-off, add a note explaining why.',
        });
      }
    }
  });

  return issues;
}

// Real Tailwind utility prefixes that can carry a value from each token
// category, used to bound extractTokensUsed's suffix match. Without this, a
// bare `[a-z]+-<suffix>` match false-positives on any unrelated class that
// happens to end the same way — e.g. token radius-none's suffix "none"
// matching inside "pointer-events-none"/"outline-none"/"select-none", none
// of which have anything to do with border-radius. Caught via the live
// Radius foundation page showing radius-none as "used by" five components
// that don't use rounded-none anywhere.
const TOKEN_UTILITY_PREFIXES = {
  'color-': ['bg', 'text', 'border', 'ring-offset', 'ring', 'outline', 'fill', 'stroke', 'divide', 'decoration', 'caret', 'accent', 'from', 'via', 'to', 'placeholder', 'shadow'],
  'spacing-': ['px', 'py', 'pt', 'pb', 'pl', 'pr', 'p', 'mx', 'my', 'mt', 'mb', 'ml', 'mr', 'm', 'gap-x', 'gap-y', 'gap', 'space-x', 'space-y', 'inset-x', 'inset-y', 'inset', 'top', 'right', 'bottom', 'left', 'min-w', 'min-h', 'max-w', 'max-h', 'w', 'h', 'size'],
  'radius-': ['rounded-tl', 'rounded-tr', 'rounded-bl', 'rounded-br', 'rounded-ss', 'rounded-se', 'rounded-es', 'rounded-ee', 'rounded-t', 'rounded-b', 'rounded-l', 'rounded-r', 'rounded-s', 'rounded-e', 'rounded'],
  'text-': ['text', 'leading'],
  'font-': ['font'],
};

const CATEGORY_PREFIXES = ['color-', 'spacing-', 'radius-', 'text-', 'font-'];

// Single source of truth for "does this component's source reference this
// registered token", shared by extractTokensUsed (component -> tokens) and
// findConsumers (token -> components) so both stay in sync by construction.
function tokenUsedInSource(cssName, componentSource) {
  let suffix = cssName;
  let allowedPrefixes = null;
  for (const prefix of CATEGORY_PREFIXES) {
    if (cssName.startsWith(prefix)) {
      suffix = cssName.slice(prefix.length);
      allowedPrefixes = TOKEN_UTILITY_PREFIXES[prefix];
      break;
    }
  }
  const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // (?!-[a-z]) blocks a shorter token's suffix from matching as a false
  // prefix of a longer, distinct class — e.g. color-action-secondary
  // matching inside "bg-action-secondary-hover".
  const prefixPattern = allowedPrefixes
    ? `(?:${allowedPrefixes.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`
    : '[a-z]+';
  const re = new RegExp(`${prefixPattern}-${escaped}\\b(?!-[a-z])`, 'i');
  return re.test(stripComments(componentSource));
}

// Scans a component's source for usage of registered tokens (by suffix
// match against tokens.css's @theme names) so "Design Tokens Used" in the
// docs page is auto-derived from real usage, not hand-maintained.
export function extractTokensUsed(componentSource, cssTokenNames) {
  const used = new Set();
  for (const fullName of cssTokenNames) {
    if (fullName.includes('--')) continue; // skip --text-x--line-height companions
    if (tokenUsedInSource(fullName, componentSource)) {
      used.add(fullName);
    }
  }
  return [...used].sort();
}

// ---------------------------------------------------------------------------
// 1b. Accessibility (heuristic — see docs/design-system-rules.md § Accessibility)
// ---------------------------------------------------------------------------

export function checkAccessibility(name, rawSource) {
  const issues = [];
  const file = `src/components/${name}/${name}.tsx`;
  const source = stripComments(rawSource);

  const divOnClick = source.search(/<div[^>]*\bonClick\b/);
  if (divOnClick !== -1) {
    issues.push({
      level: 'fail',
      file,
      line: lineOf(source, divOnClick),
      code: 'div-onclick',
      message: 'This clickable area is built from a plain block, not a real button or link — keyboard and screen-reader users may not be able to reach it.',
      fix: 'Turn this into a real button or link instead of a clickable block — that makes it usable by keyboard and screen readers automatically.',
    });
  }

  const focusIdx = source.search(/\bfocus:/);
  if (focusIdx !== -1 && !/focus-visible:/.test(source)) {
    issues.push({
      level: 'fail',
      file,
      line: lineOf(source, focusIdx),
      code: 'focus-visible-missing',
      message: "The focus outline shows up on mouse clicks as well as keyboard use, but it's meant to appear only for people navigating by keyboard.",
      fix: "Switch this to the keyboard-only focus style so mouse users don't see a ring that isn't meant for them.",
    });
  }

  const hasDisabledPointerEventsGuard = /(?:^|[\s'"])(?:disabled|has-\[:disabled\]):pointer-events-none\b/.test(source);
  const disabledIdx = source.search(/\bdisabled\b/);
  if (disabledIdx !== -1 && !hasDisabledPointerEventsGuard) {
    issues.push({
      level: 'warn',
      file,
      line: lineOf(source, disabledIdx),
      code: 'disabled-pointer-events-missing',
      message: "This has a disabled state, but hover effects might still show while it's disabled — which can make it look clickable when it isn't.",
      fix: "Turn off hover effects specifically for the disabled state, so it doesn't look interactive when it isn't.",
    });
  }

  const svgBlocks = [...source.matchAll(/<svg[\s\S]*?<\/svg>/g)];
  svgBlocks.forEach((block, idx) => {
    if (!/aria-hidden/.test(block[0])) {
      issues.push({
        level: 'warn',
        file,
        line: lineOf(source, block.index),
        code: `svg-aria-hidden-missing:${idx}`,
        message: "This icon isn't marked as decorative, so a screen reader may try to announce it and confuse the person using one.",
        fix: "Mark the icon as decorative if it's just visual flair, or give it a real description if it conveys meaning on its own.",
      });
    }
  });

  const checkboxIdx = source.search(/type=["'](?:checkbox|radio)["']/);
  if (checkboxIdx !== -1 && !/sr-only/.test(source)) {
    issues.push({
      level: 'warn',
      file,
      line: lineOf(source, checkboxIdx),
      code: 'checkbox-sr-only-missing',
      message: 'This checkbox or radio button has a custom look, but the real control underneath may not be reachable by keyboard or screen reader.',
      fix: "Keep the real checkbox/radio in place and only hide it visually — don't remove it from the page, or keyboard and screen-reader users lose it entirely.",
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 1b-2. Contrast maths + approved-pairings cross-reference (deferred here
// from the interactive Ready-for-AI check because both require resolving
// real hex values and running the WCAG formula, not a quick lookup — see
// docs/ready-for-ai.md's "Check speed" section. This is the part of
// Accessibility basics that's authoritative; the Ready-for-AI check only
// does a manual gut-check.
// ---------------------------------------------------------------------------

// Pulls every --color-{text,surface,state,action}-* value out of
// tokens.css, keyed by the suffix that also appears as a Surface Pairings
// row/column key (e.g. "surface-inverse", "state-warning", "text-inverse")
// — the same suffix Tailwind uses in bg-{suffix}/text-{suffix}. rgba()
// values (e.g. action-secondary's transparent fill) can't be reduced to a
// single contrast figure against an unknown backdrop, so they're kept out
// of the map entirely rather than guessed at.
export function parseColorHexTokens(cssRaw) {
  const map = new Map();
  const re = /--color-((?:text|surface|state|action)-[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let match;
  while ((match = re.exec(cssRaw))) {
    map.set(match[1], match[2]);
  }
  return map;
}

// Parses design-system-rules.md §7's Surface Pairings table into
// { rows: Map<surfaceKey, Map<textKey, ratioLabel>>, textUniverse: Set<textKey> }.
// `rows`' keys double as the only valid bg-{key} tokens to check (anything
// not in this table was never meant to be a text-pairing surface); textUniverse
// is every token ever listed as an approved text partner across all rows,
// which is also the only valid text-{key} tokens to check — this is what
// lets `bg-state-hover` (a real Tailwind class, but not a documented surface)
// and `text-label` (a typography token, not a colour) get ignored automatically
// rather than needing their own exclusion list.
export function parseSurfacePairingsTable(rulesRaw) {
  const rows = new Map();
  const textUniverse = new Set();
  const rowRe = /^\|\s*`([a-z0-9-]+)`\s*\(`#[0-9a-fA-F]{3,8}`\)\s*\|\s*(.+?)\s*\|\s*$/;
  for (const rawLine of rulesRaw.split('\n')) {
    const m = rowRe.exec(rawLine.trim());
    if (!m) continue;
    const [, surfaceKey, cellText] = m;
    const parts = cellText.split('·').map((s) => s.trim()).filter(Boolean);
    const textMap = new Map();
    for (let i = 0; i < parts.length - 1; i += 2) {
      textMap.set(parts[i], parts[i + 1]);
      textUniverse.add(parts[i]);
    }
    rows.set(surfaceKey, textMap);
  }
  return { rows, textUniverse };
}

function hexToRgb01(hex) {
  const h = hex.slice(1);
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

// Standard sRGB -> linear-light transfer function, per the WCAG 2.x
// relative-luminance definition.
function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb01(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrastRatio(hexA, hexB) {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

// Real contrast maths + §7 cross-reference for a component's background/text
// token pairs. Only runs when the file uses exactly one colour-token text
// class — with more than one, which text token actually renders against
// which background can't be told apart from source text alone (e.g.
// Button's several variant-specific text colours), and guessing would risk
// a false FAIL against real, working code; with zero, there's nothing to
// pair. One shared text colour applied across several backgrounds (Badge's
// base label colour against each variant's fill) is exactly the case this
// can check safely.
export function checkContrastPairings(name, source, colorHex, pairingsTable) {
  const issues = [];
  const file = `src/components/${name}/${name}.tsx`;
  const codeOnly = stripComments(source);

  const bgTokens = [...new Set([...codeOnly.matchAll(/\bbg-([a-z][a-z0-9-]*)\b/g)].map((m) => m[1]))].filter(
    (t) => pairingsTable.rows.has(t),
  );
  const textTokens = [...new Set([...codeOnly.matchAll(/\btext-([a-z][a-z0-9-]*)\b/g)].map((m) => m[1]))].filter(
    (t) => pairingsTable.textUniverse.has(t) && colorHex.has(t),
  );

  if (bgTokens.length === 0 || textTokens.length !== 1) return issues;

  const [textToken] = textTokens;
  const textHex = colorHex.get(textToken);

  for (const bgToken of bgTokens) {
    const bgHex = colorHex.get(bgToken);
    if (!bgHex) continue;
    const ratio = contrastRatio(bgHex, textHex);
    const ratioLabel = `${ratio.toFixed(1)}:1`;

    if (ratio < 4.5) {
      issues.push({
        level: 'fail',
        file,
        line: null,
        code: `contrast-fail:${bgToken}:${textToken}`,
        message: `text-${textToken} on bg-${bgToken} measures ${ratioLabel} — below the 4.5:1 AA minimum for normal text (WCAG 2.2 SC 1.4.3).`,
        fix: 'Use a text or background token here that clears 4.5:1 against its pair, or ask design to rebind one of these tokens.',
      });
    } else if (!pairingsTable.rows.get(bgToken)?.has(textToken)) {
      issues.push({
        level: 'warn',
        file,
        line: null,
        code: `contrast-undocumented:${bgToken}:${textToken}`,
        message: `text-${textToken} on bg-${bgToken} clears AA (${ratioLabel}) but isn't listed as an approved pairing in docs/design-system-rules.md §7.`,
        fix: `Add text-${textToken} to bg-${bgToken}'s row in the Surface Pairings table (§7) so this combination is documented, not just coincidentally passing.`,
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 1c. Storybook coverage
// ---------------------------------------------------------------------------

export function checkStorybookCoverage(name, dir, componentSource, storiesSource) {
  const issues = [];
  const indexPath = join(dir, 'index.ts');
  const storiesFile = `src/components/${name}/${name}.stories.tsx`;

  if (!existsSync(indexPath)) {
    issues.push({
      level: 'fail',
      file: `src/components/${name}/index.ts`,
      line: null,
      code: 'missing-index',
      message: "This component isn't set up to be used anywhere else yet.",
      fix: 'Add the missing export file so other parts of the app can use this component.',
    });
  }

  if (!/tags:\s*\[[^\]]*['"]autodocs['"]/.test(storiesSource)) {
    issues.push({
      level: 'fail',
      file: storiesFile,
      line: null,
      code: 'missing-autodocs',
      message: "This component won't get an automatic documentation page in Storybook.",
      fix: "Turn on automatic documentation for this component's Storybook entry.",
    });
  }

  const hasDisabledProp = /\bdisabled\b/.test(stripComments(componentSource));
  const hasDisabledStory = /export const Disabled\b/i.test(storiesSource);
  if (hasDisabledProp && !hasDisabledStory) {
    issues.push({
      level: 'fail',
      file: storiesFile,
      line: null,
      code: 'missing-disabled-story',
      message: "This component has a disabled state, but there's nowhere to preview what it looks like.",
      fix: 'Add a Storybook example showing the disabled state, so it can be checked visually.',
    });
  }

  const storyExportCount = (storiesSource.match(/export const \w+: Story/g) ?? []).length;
  if (storyExportCount === 0) {
    issues.push({
      level: 'fail',
      file: storiesFile,
      line: null,
      code: 'missing-stories',
      message: "There's nothing to preview for this component in Storybook yet.",
      fix: 'Add at least one example so this component can be viewed and checked in Storybook.',
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 2. Documentation: reading, parsing, generating, and validating
//    ComponentName.docs.ts (the ComponentDocMeta contract from
//    src/design-docs/types.ts)
// ---------------------------------------------------------------------------

// Finds the `export const docs = { ... };` object literal by brace-balance
// counting (not a regex with a fixed end pattern), since the object can
// contain nested arrays/strings with braces-look-alike characters.
function extractBalancedObject(source, marker) {
  const startIdx = source.indexOf(marker);
  if (startIdx === -1) return null;
  const braceStart = source.indexOf('{', startIdx);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(braceStart, i + 1);
    }
  }
  return null;
}

// Converts the TS object literal into JSON so it can be parsed generically
// instead of with brittle per-field regexes. Only handles the flat
// string/string[] shape ComponentDocMeta actually has (no nesting) — the
// generator that writes these files always uses a whitelisted set of bare
// keys and single-quoted strings, which is what makes this safe: the
// key-quoting step only touches those exact field names, so it can't
// accidentally rewrite something that looks like "word:" inside prose.
const DOC_FIELD_NAMES = [
  'description',
  'usageGuidelines',
  'dos',
  'donts',
  'variants',
  'states',
  'accessibilityNotes',
  'codeExample',
];

function tsObjectLiteralToJson(text) {
  let out = text;
  const fieldAlternation = DOC_FIELD_NAMES.join('|');
  out = out.replace(new RegExp(`([{,]\\s*)(${fieldAlternation})(\\s*:)`, 'g'), '$1"$2"$3');
  // single-quoted strings -> JSON strings (handles \' escapes)
  out = out.replace(/'((?:[^'\\]|\\.)*)'/g, (_, inner) => JSON.stringify(inner.replace(/\\'/g, "'")));
  // trailing commas before } or ]
  out = out.replace(/,(\s*[}\]])/g, '$1');
  try {
    return JSON.parse(out);
  } catch {
    return null;
  }
}

export function readDocsFile(dir, name) {
  const docsPath = join(dir, `${name}.docs.ts`);
  if (!existsSync(docsPath)) return { exists: false, data: null };
  const raw = readFileSync(docsPath, 'utf8');
  const objText = extractBalancedObject(raw, 'export const docs');
  if (!objText) return { exists: true, data: null };
  return { exists: true, data: tsObjectLiteralToJson(objText) };
}

// Auto-derives variants/states from patterns that already exist in every
// component built so far: an exported `FooVariant`/`FooSize` union type for
// variants, and which Tailwind state variants (hover:/focus-visible:/
// disabled:) actually appear in the source for states.
function deriveVariantsAndStates(componentSource) {
  const codeOnly = stripComments(componentSource);
  const variants = [];

  const unionRe = /export type \w*(?:Variant|Size)\w*\s*=\s*([^;]+);/g;
  let m;
  while ((m = unionRe.exec(componentSource))) {
    const literals = [...m[0].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    for (const lit of literals) {
      if (!variants.includes(lit)) variants.push(lit);
    }
  }

  const states = ['default'];
  if (/hover:/.test(codeOnly)) states.push('hover');
  if (/focus-visible:|focus:/.test(codeOnly)) states.push('focus');
  if (/disabled:|has-\[:disabled\]/.test(codeOnly)) states.push('disabled');
  if (/checked:|:checked/.test(codeOnly)) states.push('checked');

  return { variants, states };
}

// Step 3 of the pipeline: writes a starter ComponentName.docs.ts when one
// doesn't exist yet, so "missing documentation" is something design-sync
// fixes as far as it structurally can, not just something it reports.
// Prose fields (description/usage/do-dont/accessibility) are left as
// clearly-marked TODOs — those need human or Figma-sourced judgment, which
// is exactly the line this static script shouldn't cross on its own.
function generateDocsStub(name, dir, componentSource) {
  const docsPath = join(dir, `${name}.docs.ts`);
  if (existsSync(docsPath)) return false;

  const { variants, states } = deriveVariantsAndStates(componentSource);
  const listLiteral = (arr) => `[${arr.map((v) => `'${v}'`).join(', ')}]`;

  const stub = `import type { ComponentDocMeta } from '../../design-docs/types';

// Auto-generated stub by \`npm run design-sync\` — variants/states below were
// derived from ${name}.tsx's exported types and Tailwind state variants.
// The TODO fields need human authoring; design-sync flags them as
// incomplete (not failing) until the TODO markers are replaced.
export const docs: ComponentDocMeta = {
  description: 'TODO: describe what ${name} is for and when to use it.',
  usageGuidelines: ['TODO: add usage guidance.'],
  dos: ['TODO: add Do guidance.'],
  donts: ['TODO: add Do not guidance.'],
  variants: ${listLiteral(variants)},
  states: ${listLiteral(states)},
  accessibilityNotes: ['TODO: add accessibility notes.'],
  codeExample: 'TODO: add a short usage snippet.',
};
`;
  writeFileSync(docsPath, stub);
  return true;
}

export function checkDocumentation(name, dir, storiesSource, docsResult, tokensUsed) {
  const issues = [];
  const { exists, data } = docsResult;
  const docsFile = `src/components/${name}/${name}.docs.ts`;
  const componentFile = `src/components/${name}/${name}.tsx`;
  const storiesFile = `src/components/${name}/${name}.stories.tsx`;

  if (!exists) {
    issues.push({
      level: 'fail',
      file: docsFile,
      line: null,
      code: 'missing-docs-file',
      message: "This component has no written guidance yet — no description, usage advice, or accessibility notes.",
      fix: 'Run the design-sync command to generate a starting template, then fill it in with real guidance.',
    });
  } else if (!data) {
    issues.push({
      level: 'fail',
      file: docsFile,
      line: null,
      code: 'docs-file-unparseable',
      message: "The documentation for this component exists but is broken and can't be read.",
      fix: 'Check the documentation file for a typo, like a missing bracket or quote, and fix it so it can be read again.',
    });
  } else {
    const hasTodo = JSON.stringify(data).includes('TODO');
    const level = hasTodo ? 'warn' : 'fail';
    const todoNote = hasTodo ? ' (this was auto-filled and still needs a person to write the real version)' : '';

    if (!data.description?.trim()) {
      issues.push({
        level,
        file: docsFile,
        line: null,
        code: 'missing-description',
        message: `There's no description explaining what this component is or when to use it${todoNote}.`,
        fix: 'Write one or two sentences describing what this component is for and when someone should reach for it.',
      });
    }
    if (!data.usageGuidelines?.length) {
      issues.push({
        level,
        file: docsFile,
        line: null,
        code: 'missing-usage-guidelines',
        message: `There's no guidance on how this component should be used${todoNote}.`,
        fix: 'Add a few short, practical tips on how to use this component correctly.',
      });
    }
    if (!data.accessibilityNotes?.length) {
      issues.push({
        level,
        file: docsFile,
        line: null,
        code: 'missing-accessibility-notes',
        message: `There are no accessibility notes for this component${todoNote}.`,
        fix: 'Add a few notes on how this component behaves for keyboard and screen-reader users.',
      });
    }
    if (!data.codeExample?.trim() || data.codeExample.includes('TODO')) {
      issues.push({
        level: 'warn',
        file: docsFile,
        line: null,
        code: 'missing-code-example',
        message: `There's no example showing how to use this component in code${todoNote}.`,
        fix: 'Add a short, real example of how this component is typically used.',
      });
    }
  }

  if (tokensUsed.length === 0) {
    issues.push({
      level: 'warn',
      file: componentFile,
      line: null,
      code: 'no-tokens-used',
      message: "This component doesn't appear to use any colours, spacing, or sizing from the design system.",
      fix: 'Double check this is intentional — if the component should be using design system values, update it to reference them.',
    });
  }

  if (!/tags:\s*\[[^\]]*['"]autodocs['"]/.test(storiesSource)) {
    issues.push({
      level: 'fail',
      file: storiesFile,
      line: null,
      code: 'missing-autodocs',
      message: "This component won't get an automatic documentation page in Storybook.",
      fix: "Turn on automatic documentation for this component's Storybook entry.",
    });
  }

  // A docs file can exist, parse, and have real content while never actually
  // reaching Storybook — the shared DocsPage template only renders it if the
  // story imports it and threads it into parameters.designSystem. Checking
  // the docs file in isolation (above) can't catch that gap; this can.
  if (exists && data && !/designSystem:\s*docs\b/.test(storiesSource)) {
    issues.push({
      level: 'fail',
      file: storiesFile,
      line: null,
      code: 'docs-not-wired',
      message: "This component's documentation was written but never connected to Storybook — the story doesn't import it and pass it as parameters.designSystem, so the Docs page falls back to the bare auto-generated prop table instead of showing it.",
      fix: `Import docs from './${name}.docs' and validation from './${name}.validation.json', then add designSystem: docs and designSystemValidation: validation to the story's parameters — see an existing component's .stories.tsx for the pattern.`,
    });
  }

  const storyExportCount = (storiesSource.match(/export const \w+: Story/g) ?? []).length;
  if (storyExportCount === 0) {
    issues.push({
      level: 'fail',
      code: 'missing-stories',
      file: storiesFile,
      line: null,
      message: "There's nothing to preview for this component in Storybook yet.",
      fix: 'Add at least one example so this component can be viewed and checked in Storybook.',
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Validation report: ComponentName.validation.json, consumed by DocsPage.tsx
// for the "Validation Status" section and DesignOps metadata block. This is
// also the single source of truth every other surface (dashboard, Storybook
// badges, PR comments) reads from — none of them re-run these checks
// themselves, they only read what this section computed and wrote.
// ---------------------------------------------------------------------------

const CHECK_TYPE_KEYS = ['tokenCompliance', 'accessibility', 'storybookCoverage', 'documentationCoverage'];

function readPreviousReport(dir, name) {
  const path = join(dir, `${name}.validation.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

// Stable identity for an issue so the same problem is recognized as "the
// same issue" across runs even if unrelated issues shift position in the
// array — deliberately NOT based on the human-readable message. Rewording a
// message (to make it plainer, fix a typo, etc.) must never look like the
// underlying issue was fixed and a new one appeared; `code` is a short,
// stable identifier orthogonal to the prose, embedding whatever makes an
// instance unique (e.g. the specific hex value for a raw-color hit) so two
// different problems on the same line still resolve to different keys.
function issueKey(issue) {
  return `${issue.checkType}::${issue.file}::${issue.code}`;
}

// Three-state status shared by every consumer (Storybook badges, dashboard
// rows, PR comments) — computed once here, never re-derived downstream. A
// component (or check) that passes everything but has open warnings isn't a
// clean pass: it gets its own state rather than being collapsed into a
// pass/fail boolean.
function statusFor(fail, warn) {
  if (fail > 0) return 'fail';
  if (warn > 0) return 'pass-with-warnings';
  return 'pass';
}

// Builds one component's full report: current open issues per check
// category, plus a history log of issues that were open in the *previous*
// committed report but aren't open anymore — i.e. actually caught and fixed
// between runs, not asserted. For a component whose previous report has no
// issue-level detail (the old boolean-only schema, or no report at all yet),
// there's nothing to diff against, so history starts empty rather than
// guessing — see docs/design-system-rules.md §5 for why that's the honest
// answer for this system's original 6 components.
function buildComponentReport(name, dir, issuesByCheck) {
  const previous = readPreviousReport(dir, name);
  // .filter(code != null) matters, not just belt-and-suspenders: a previous
  // report written before `code` existed on issues (or before this history
  // mechanism existed at all) has open issues with no `code` field. Without
  // this filter, issueKey() would compute `code: undefined` for every one of
  // them, which can never match a freshly-computed key (those always have a
  // real code) — every old issue would look "resolved" on the very next run
  // even though nothing was fixed. Excluding them makes a schema/key-scheme
  // change behave the same honest way as "no prior report at all": nothing
  // to diff against, so nothing gets asserted as caught-and-fixed.
  const previousOpenIssues = previous?.checks
    ? Object.values(previous.checks).flatMap((c) => c.open ?? []).filter((issue) => issue.code != null)
    : [];
  const previousHistory = previous?.history ?? [];

  const checks = {};
  let overall = true;
  let totalFail = 0;
  let totalWarn = 0;
  for (const key of CHECK_TYPE_KEYS) {
    const issues = (issuesByCheck[key] ?? []).map((issue) => ({ ...issue, checkType: key }));
    const fail = issues.filter((i) => i.level === 'fail').length;
    const warn = issues.filter((i) => i.level === 'warn').length;
    const pass = fail === 0;
    if (!pass) overall = false;
    totalFail += fail;
    totalWarn += warn;
    checks[key] = { pass, fail, warn, status: statusFor(fail, warn), open: issues };
  }

  const currentOpenKeys = new Set(Object.values(checks).flatMap((c) => c.open).map(issueKey));
  const today = new Date().toISOString().slice(0, 10);
  const newlyResolved = previousOpenIssues
    .filter((issue) => !currentOpenKeys.has(issueKey(issue)))
    .map((issue) => ({
      checkType: issue.checkType,
      file: issue.file,
      line: issue.line ?? null,
      message: issue.message,
      fix: issue.fix ?? null,
      resolvedAt: today,
    }));

  return {
    checks,
    history: [...previousHistory, ...newlyResolved],
    overall,
    status: statusFor(totalFail, totalWarn),
  };
}

function writeValidationReport(dir, report) {
  writeFileSync(join(dir, `${report.component}.validation.json`), JSON.stringify(report, null, 2) + '\n');
}

const VALIDATION_REPORT_PATH = join(ROOT, 'src', 'design-docs', 'validation-report.generated.json');

// The one consolidated artifact every non-Storybook surface (dashboard, PR
// comments) reads — same computation as the per-component files above, just
// aggregated in one place instead of requiring six separate imports.
function writeConsolidatedReport(componentResults, categoryPass, overallStatus) {
  const totalFail = componentResults.reduce(
    (sum, r) => sum + Object.values(r.checks).reduce((s, c) => s + c.fail, 0),
    0,
  );
  const totalWarn = componentResults.reduce(
    (sum, r) => sum + Object.values(r.checks).reduce((s, c) => s + c.warn, 0),
    0,
  );
  const data = {
    generatedAt: new Date().toISOString(),
    overallStatus,
    status: statusFor(totalFail, totalWarn),
    categoryPass,
    components: componentResults,
  };
  writeFileSync(VALIDATION_REPORT_PATH, JSON.stringify(data, null, 2) + '\n');
}

// Step 4: confirm the current (and any newly-generated) content actually
// builds as Storybook docs, not just that our own heuristics are satisfied.
function regenerateStorybookDocs() {
  try {
    execSync('npm run build-storybook', { cwd: ROOT, stdio: 'pipe' });
    return { pass: true };
  } catch (err) {
    return { pass: false, output: (err.stdout ?? err.message ?? '').toString().slice(-2000) };
  }
}

// ---------------------------------------------------------------------------
// 3. Design Foundations: reads tokens.css/tokens.json as the single source of
// truth (never re-derives values by other means), generates the data every
// Foundation Storybook page renders from, and cross-references which
// components actually consume each token.
// ---------------------------------------------------------------------------

const FOUNDATIONS_DATA_PATH = join(ROOT, 'src', 'design-docs', 'foundations-data.generated.json');
const FOUNDATIONS_MDX_DIR = join(ROOT, 'src', 'design-docs', 'foundations');
const REQUIRED_FOUNDATION_PAGES = ['Colours', 'Typography', 'Spacing', 'Radius', 'Shadows', 'Motion', 'Breakpoints'];
// Maps a required page name to the foundationData category key it renders —
// needed because "Colours" (UK spelling, matches the page title) isn't the
// same string as "color" (the internal/tokens.json category key).
const FOUNDATION_PAGE_CATEGORY = {
  Colours: 'color',
  Typography: 'typography',
  Spacing: 'spacing',
  Radius: 'radius',
  Shadows: 'shadow',
  Motion: 'motion',
  Breakpoints: 'breakpoint',
};

// Associates each `--token: value;` declaration in the @theme block with
// whatever comment immediately precedes it. A comment applies ONLY to the
// single token directly beneath it — consumed and cleared the moment it's
// used, never carried forward to later tokens in the same contiguous
// (no-blank-line) run, even if no blank line separates them.
//
// An earlier version let a comment stay "pending" until a blank line or a
// replacement comment appeared, so one comment could deliberately cover a
// whole multi-token block (e.g. the spacing ramp's single "px, not rem"
// note). That was caught in PR cross-review as a real bug, not a feature:
// it let one token's specific note bleed across an entire unrelated ramp
// whenever a new single-token comment was added without a following blank
// line — every Amber step inherited Amber/25's "new token" note,
// Terracotta 200-900 inherited Terracotta/100's "darkened" note while
// actually being unchanged, Olive 100-900 inherited Olive/75's "new,
// inferred" note. Per-token-only trades away the one legitimate
// multi-token case (spacing's tokens now fall back to the generic spacing
// description instead of the shared px-not-rem note) to make that whole
// class of bug impossible — a genuinely shared note now has to be repeated
// above each token it applies to, not implied by adjacency.
function extractCssTokenComments(cssRaw) {
  const themeStart = cssRaw.indexOf('@theme');
  if (themeStart === -1) return {};
  const braceStart = cssRaw.indexOf('{', themeStart);
  let depth = 0;
  let braceEnd = -1;
  for (let i = braceStart; i < cssRaw.length; i++) {
    if (cssRaw[i] === '{') depth++;
    else if (cssRaw[i] === '}') {
      depth--;
      if (depth === 0) {
        braceEnd = i;
        break;
      }
    }
  }
  const body = cssRaw.slice(braceStart + 1, braceEnd === -1 ? undefined : braceEnd);

  const comments = {};
  let pending = null;
  let inBlock = false;
  let buffer = [];

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (line === '') {
      pending = null;
      continue;
    }
    if (inBlock) {
      buffer.push(line);
      if (line.includes('*/')) {
        inBlock = false;
        pending = buffer.join(' ').replace(/\/\*+|\*+\//g, '').replace(/\s+/g, ' ').trim();
        buffer = [];
      }
      continue;
    }
    if (line.startsWith('/*')) {
      if (line.includes('*/')) {
        pending = line.replace(/\/\*+|\*+\//g, '').trim();
      } else {
        inBlock = true;
        buffer = [line];
      }
      continue;
    }
    const tokenMatch = line.match(/^--([a-z0-9-]+)\s*:/i);
    if (tokenMatch && pending) {
      comments[tokenMatch[1]] = pending;
      // Consumed — a comment describes only the token directly beneath it,
      // never subsequent ones in the same contiguous run. See the note
      // above this function for why this doesn't just reset on blank lines.
      pending = null;
    }
  }
  return comments;
}

function genericUsageFor(category, group) {
  const defaults = {
    color: `Color token${group ? ` in the "${group}" group` : ''}.`,
    spacing: 'Spacing scale value used for padding and gap.',
    radius: 'Corner radius scale value.',
    typography: 'Type style (font size, line height, family).',
    motion: 'Motion timing standard.',
    breakpoint: 'Responsive breakpoint value.',
  };
  return defaults[category] ?? 'Design token.';
}

// Figma's "Primitives" collection (71 raw palette colors) vs. "Semantic"
// collection (26 purpose-named tokens, several of which alias directly into
// these ramps) — two different tiers with two different documentation
// needs. A primitive's correct, complete "usage" description is its
// position in the ramp; nothing more specific is meaningful to say about
// "Sand, step 700" the way there is for a purpose-named token like
// action-primary. Distinguishing tier is what lets the "No undocumented
// tokens" check treat a primitive's ramp-position description as real
// documentation rather than flagging all 71 as needing individual notes.
const PRIMITIVE_COLOR_FAMILIES = new Set([
  'sand',
  'terracotta',
  'rose',
  'burgundy',
  'amber',
  'olive',
  'grey',
  'cream',
  'green',
  'red',
  'alpha',
]);

function isPrimitiveColorGroup(group) {
  return PRIMITIVE_COLOR_FAMILIES.has(group);
}

function rampPositionUsage(group, key, allKeysInGroup) {
  const familyLabel = group[0].toUpperCase() + group.slice(1);
  const sorted = [...allKeysInGroup].sort((a, b) => Number(a) - Number(b));
  const position = sorted.indexOf(key) + 1;
  return `${familyLabel} palette — step ${key} (${position} of ${sorted.length} in the ramp).`;
}

// Human-facing "type" label shown in the Foundation table's Token Type
// column — distinct from the internal `category` key used for routing to
// the right preview renderer.
const TOKEN_TYPE_LABELS = {
  color: 'Color',
  spacing: 'Spacing',
  radius: 'Radius',
  typography: 'Typography',
  motion: 'Motion',
  breakpoint: 'Breakpoint',
};

// Which components reference a token, by the same suffix-match rule as
// extractTokensUsed — inverted (token -> components, not component ->
// tokens) so the Foundation pages can cross-reference consumers.
function findConsumers(cssName, componentSources) {
  return componentSources.filter(({ source }) => tokenUsedInSource(cssName, source)).map(({ name }) => name);
}

// Motion's named tokens (duration-standard/ease-standard) aren't referenced
// by name in any component yet — they formalize a value already used
// identically via Tailwind's own literal duration-150/ease-out (see
// tokens.css). That literal usage is a real consumer, just not yet migrated
// to the named token — tracked separately so it isn't reported orphaned.
function findLiteralMotionConsumers(componentSources) {
  return componentSources
    .filter(({ source }) => /duration-150\b/.test(source) && /ease-out\b/.test(source))
    .map(({ name }) => name);
}

function buildFoundationData(cssRaw, tokensJson, componentSources) {
  const cssComments = extractCssTokenComments(cssRaw);
  const data = { color: [], typography: [], spacing: [], radius: [], motion: [], breakpoint: [], shadow: [] };

  for (const [group, entries] of Object.entries(tokensJson.color ?? {})) {
    const isPrimitive = isPrimitiveColorGroup(group);
    const groupKeys = Object.keys(entries);
    for (const [key, entry] of Object.entries(entries)) {
      const cssName = `color-${group}-${key}`;
      const specificNote = entry.note || cssComments[cssName];
      const fallbackUsage = isPrimitive
        ? rampPositionUsage(group, key, groupKeys)
        : genericUsageFor('color', group);
      data.color.push({
        type: TOKEN_TYPE_LABELS.color,
        tier: isPrimitive ? 'primitive' : 'semantic',
        name: `--${cssName}`,
        tokenPath: `color.${group}.${key}`,
        value: entry.value,
        usage: specificNote || fallbackUsage,
        // A primitive's ramp-position fallback IS its complete, correct
        // documentation — there's nothing more specific to say. Only
        // semantic tokens get nudged toward writing a real note.
        documented: Boolean(specificNote) || isPrimitive,
        consumedBy: findConsumers(cssName, componentSources),
      });
    }
  }

  for (const [key, entry] of Object.entries(tokensJson.spacing ?? {})) {
    const cssName = `spacing-${key}`;
    const specificNote = cssComments[cssName];
    data.spacing.push({
      type: TOKEN_TYPE_LABELS.spacing,
      name: `--${cssName}`,
      tokenPath: `spacing.${key}`,
      value: entry.value,
      usage: specificNote || genericUsageFor('spacing'),
      documented: Boolean(specificNote),
      consumedBy: findConsumers(cssName, componentSources),
    });
  }

  for (const [key, entry] of Object.entries(tokensJson.radius ?? {})) {
    const cssName = `radius-${key}`;
    const specificNote = cssComments[cssName];
    data.radius.push({
      type: TOKEN_TYPE_LABELS.radius,
      name: `--${cssName}`,
      tokenPath: `radius.${key}`,
      value: entry.value,
      usage: specificNote || genericUsageFor('radius'),
      documented: Boolean(specificNote),
      consumedBy: findConsumers(cssName, componentSources),
    });
  }

  for (const [key, entry] of Object.entries(tokensJson.typography ?? {})) {
    const cssName = `text-${key}`;
    const specificNote = cssComments[cssName];
    data.typography.push({
      type: TOKEN_TYPE_LABELS.typography,
      name: `--${cssName}`,
      tokenPath: `typography.${key}`,
      value: `${entry.fontSize} / ${entry.lineHeight} / ${entry.fontFamily}`,
      fontFamily: entry.fontFamily,
      fontSize: entry.fontSize,
      lineHeight: entry.lineHeight,
      fontWeight: entry.fontWeight,
      letterSpacing: entry.letterSpacing,
      usage: specificNote || genericUsageFor('typography'),
      documented: Boolean(specificNote),
      consumedBy: findConsumers(cssName, componentSources),
    });
  }

  for (const [key, entry] of Object.entries(tokensJson.motion ?? {})) {
    const namedConsumers = [
      ...new Set([...findConsumers(`duration-${key}`, componentSources), ...findConsumers(`ease-${key}`, componentSources)]),
    ];
    const literalConsumers = findLiteralMotionConsumers(componentSources).filter((n) => !namedConsumers.includes(n));
    data.motion.push({
      type: TOKEN_TYPE_LABELS.motion,
      name: `--duration-${key} / --ease-${key}`,
      tokenPath: `motion.${key}`,
      value: `${entry.duration} / ${entry.easing}`,
      duration: entry.duration,
      easing: entry.easing,
      usage: entry.note || genericUsageFor('motion'),
      documented: Boolean(entry.note),
      consumedBy: namedConsumers,
      literalConsumers,
    });
  }

  for (const [key, entry] of Object.entries(tokensJson.breakpoint ?? {})) {
    const cssName = `breakpoint-${key}`;
    const specificNote = entry.note || cssComments[cssName];
    data.breakpoint.push({
      type: TOKEN_TYPE_LABELS.breakpoint,
      name: `--${cssName}`,
      tokenPath: `breakpoint.${key}`,
      value: entry.value,
      usage: specificNote || genericUsageFor('breakpoint'),
      documented: Boolean(specificNote),
      // Breakpoints use Tailwind's responsive-variant naming (`tablet:`),
      // not the [a-z]+-<suffix> utility-class pattern findConsumers matches
      // against, and no component uses one yet regardless — see the note.
      consumedBy: [],
    });
  }

  data.shadowNote = tokensJson.shadow?.note ?? 'No shadow tokens are currently defined.';

  return data;
}

function writeFoundationData(data) {
  writeFileSync(FOUNDATIONS_DATA_PATH, JSON.stringify(data, null, 2) + '\n');
}

// Reusable template for a Foundation page: the file only needs to exist and
// point at a category — every future token category (an 8th, a 9th) gets
// its Storybook page from this same generator rather than a hand-authored
// MDX file, which is what makes new categories "generated automatically"
// per docs/design-system-rules.md §6. Mirrors generateDocsStub's pattern
// for component docs. The structure here matches the six pages already
// hand-written for Colours/Typography/Spacing/Radius/Shadows/Motion
// exactly, rather than introducing an unproven MDX pattern (e.g. inline
// comments) into an auto-generated file.
function generateFoundationPageStub(pageName, category) {
  const mdxPath = join(FOUNDATIONS_MDX_DIR, `${pageName}.mdx`);
  if (existsSync(mdxPath)) return false;

  const emptyStateProp = category === 'shadow' ? ' emptyStateNote={foundationsData.shadowNote}' : '';
  const stub = `import { Meta } from '@storybook/addon-docs/blocks';
import { FoundationPage, FoundationSection } from '../FoundationPage';
import foundationsData from '../foundations-data.generated.json';

<Meta title="Foundations/${pageName}" />

<FoundationPage
  title="${pageName}"
  description="Auto-generated by npm run design-sync from src/styles/tokens.css and src/tokens/tokens.json. Editing this page directly won't stick — add a specific per-token comment in tokens.css instead."
>
  <FoundationSection category="${category}" tokens={foundationsData.${category}}${emptyStateProp} />
</FoundationPage>
`;
  writeFileSync(mdxPath, stub);
  return true;
}

// The 4 required Foundation checks, reported as their own labeled groups:
// Token exists, Token rendered in Storybook, Foundation page generated,
// No undocumented tokens.
function checkFoundationCoverage(foundationData, tokenParityPass, generatedAnyFoundationPage) {
  const groups = {
    'Token exists': [],
    'Token rendered in Storybook': [],
    'Foundation page generated': [],
    'No undocumented tokens': [],
  };

  const allTokens = [
    ...foundationData.color,
    ...foundationData.typography,
    ...foundationData.spacing,
    ...foundationData.radius,
    ...foundationData.motion,
    ...foundationData.breakpoint,
  ];

  // Token exists: tokens.json (source of truth) and tokens.css (@theme,
  // what Storybook/Tailwind actually consume) agree — reuses the parity
  // check already run against tokens.css<->tokens.json, extended to cover
  // motion/breakpoint alongside color/spacing/radius.
  if (!tokenParityPass) {
    groups['Token exists'].push({
      level: 'fail',
      message: 'tokens.css and tokens.json are out of sync — a token in one is missing from the other (see Token parity above).',
    });
  }

  // Token rendered in Storybook: every generated record has a real,
  // non-empty value — catches a token that made it into the data file with
  // nothing to actually display.
  for (const token of allTokens) {
    if (!token.value || !String(token.value).trim()) {
      groups['Token rendered in Storybook'].push({ level: 'fail', message: `Token ${token.tokenPath} has no renderable value.` });
    }
  }

  // Foundation page generated: all 7 required .mdx pages exist. Since
  // design-sync now auto-generates any that are missing (step 3, mirroring
  // component docs generation), this should only ever fail if generation
  // itself failed.
  for (const page of REQUIRED_FOUNDATION_PAGES) {
    if (!existsSync(join(FOUNDATIONS_MDX_DIR, `${page}.mdx`))) {
      groups['Foundation page generated'].push({ level: 'fail', message: `Missing Foundation page: src/design-docs/foundations/${page}.mdx.` });
    }
  }
  if (generatedAnyFoundationPage) {
    groups['Foundation page generated'].push({
      level: 'warn',
      message: 'One or more Foundation pages were auto-generated this run from the shared template.',
    });
  }

  // No undocumented tokens: every token has at least a generic category
  // description (structurally, always true — the data generator never
  // leaves usage empty) — WARN when it's only that generic fallback rather
  // than a specific, hand-written note, so "documented" means real content,
  // not just a non-empty string.
  for (const token of allTokens) {
    if (!token.usage?.trim()) {
      groups['No undocumented tokens'].push({ level: 'fail', message: `Token ${token.tokenPath} has no usage documentation at all.` });
    } else if (!token.documented) {
      groups['No undocumented tokens'].push({
        level: 'warn',
        message: `Token ${token.tokenPath} only has a generic category description — add a specific usage note in tokens.css.`,
      });
    }
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function printIssues(issues) {
  for (const issue of issues) {
    const color = issue.level === 'fail' ? RED : YELLOW;
    const label = issue.level === 'fail' ? 'FAIL' : 'WARN';
    console.log(`    ${color}${label}${RESET}  ${issue.message}`);
  }
}

function printDotPaddedGroup(pairs) {
  const maxLabelLen = Math.max(...pairs.map(([label]) => label.length));
  const targetCol = maxLabelLen + 10;
  for (const [label, pass] of pairs) {
    const dots = Math.max(2, targetCol - label.length);
    const statusText = pass ? 'PASS' : 'FAIL';
    const color = pass ? GREEN : RED;
    console.log(`${label} ${DIM}${'.'.repeat(dots)}${RESET} ${color}${statusText}${RESET}`);
  }
}

function run() {
  const components = discoverComponents();

  console.log(`${BOLD}design-sync${RESET} — reviewing ${components.length} component(s) in src/components/\n`);

  if (components.length === 0) {
    console.log(`${YELLOW}No components found under src/components/.${RESET}`);
    process.exit(1);
  }

  const cssRaw = existsSync(TOKENS_CSS_PATH) ? readFileSync(TOKENS_CSS_PATH, 'utf8') : '';
  const cssTokenNames = parseThemeTokenNames(cssRaw);
  const rulesRaw = existsSync(DESIGN_RULES_PATH) ? readFileSync(DESIGN_RULES_PATH, 'utf8') : '';
  const colorHexTokens = parseColorHexTokens(cssRaw);
  const pairingsTable = parseSurfacePairingsTable(rulesRaw);

  console.log(`${BOLD}Step 1-2: validating components and documentation${RESET}`);
  console.log(`${BOLD}Token parity${RESET} (tokens.css <-> tokens.json)`);
  const parityIssues = checkTokenParity();
  let tokenParityPass = true;
  if (parityIssues.length === 0) {
    console.log(`  ${GREEN}PASS${RESET}  tokens.css and tokens.json are in sync\n`);
  } else {
    printIssues(parityIssues);
    tokenParityPass = !parityIssues.some((i) => i.level === 'fail');
    console.log('');
  }

  const componentResults = [];
  const componentSources = [];
  let generatedAnyDocs = false;

  for (const name of components) {
    const dir = join(COMPONENTS_DIR, name);
    const componentSource = readFileSync(join(dir, `${name}.tsx`), 'utf8');
    componentSources.push({ name, source: componentSource });
    const storiesPath = join(dir, `${name}.stories.tsx`);
    const storiesSource = existsSync(storiesPath) ? readFileSync(storiesPath, 'utf8') : '';

    const tokenIssues = checkTokenCompliance(name, componentSource);
    const a11yIssues = [
      ...checkAccessibility(name, componentSource),
      ...checkContrastPairings(name, componentSource, colorHexTokens, pairingsTable),
    ];
    const storybookIssues = existsSync(storiesPath)
      ? checkStorybookCoverage(name, dir, componentSource, storiesSource)
      : [{
          level: 'fail',
          file: `src/components/${name}/${name}.stories.tsx`,
          line: null,
          code: 'missing-stories-file',
          message: "There's nothing to preview for this component in Storybook yet — the stories file itself doesn't exist.",
          fix: 'Add a co-located ComponentName.stories.tsx with at least one example.',
        }];

    // Step 3: generate missing documentation sections before validating them,
    // so a component missing docs.ts gets scaffolded and re-checked in the
    // same run rather than needing a second invocation.
    const generated = generateDocsStub(name, dir, componentSource);
    if (generated) generatedAnyDocs = true;

    const tokensUsed = extractTokensUsed(componentSource, cssTokenNames);
    const docsResult = readDocsFile(dir, name);
    const docIssues = checkDocumentation(name, dir, storiesSource, docsResult, tokensUsed);

    const { checks, history, overall, status } = buildComponentReport(name, dir, {
      tokenCompliance: tokenIssues,
      accessibility: a11yIssues,
      storybookCoverage: storybookIssues,
      documentationCoverage: docIssues,
    });

    const report = {
      component: name,
      lastValidated: new Date().toISOString().slice(0, 10),
      checks,
      history,
      overall,
      status,
      tokensUsed,
    };
    writeValidationReport(dir, report);

    const allIssues = [...tokenIssues, ...a11yIssues, ...storybookIssues, ...docIssues];
    console.log(`${BOLD}${name}${RESET} — ${overall ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`}`);

    if (tokenIssues.length) {
      console.log(`  ${DIM}Token compliance${RESET}`);
      printIssues(tokenIssues);
    }
    if (a11yIssues.length) {
      console.log(`  ${DIM}Accessibility${RESET}`);
      printIssues(a11yIssues);
    }
    if (storybookIssues.length) {
      console.log(`  ${DIM}Storybook coverage${RESET}`);
      printIssues(storybookIssues);
    }
    if (docIssues.length) {
      console.log(`  ${DIM}Documentation${RESET}${generated ? ` ${DIM}(stub generated this run)${RESET}` : ''}`);
      printIssues(docIssues);
    }
    if (allIssues.length === 0) {
      console.log(`  ${GREEN}PASS${RESET}  no issues found`);
    }
    console.log('');

    componentResults.push(report);
  }

  console.log(`${BOLD}Foundations${RESET} (${REQUIRED_FOUNDATION_PAGES.join(', ')})`);
  const tokensJson = JSON.parse(readFileSync(TOKENS_JSON_PATH, 'utf8'));
  const foundationData = buildFoundationData(cssRaw, tokensJson, componentSources);
  writeFoundationData(foundationData);

  // Generate any missing Foundation page from the shared template before
  // validating — same "generate then re-check in the same run" pattern as
  // component docs.
  let generatedAnyFoundationPage = false;
  for (const page of REQUIRED_FOUNDATION_PAGES) {
    const generated = generateFoundationPageStub(page, FOUNDATION_PAGE_CATEGORY[page]);
    if (generated) {
      generatedAnyFoundationPage = true;
      console.log(`  ${DIM}Generated src/design-docs/foundations/${page}.mdx from the shared template${RESET}`);
    }
  }

  const foundationGroups = checkFoundationCoverage(foundationData, tokenParityPass, generatedAnyFoundationPage);
  const foundationCoveragePass = Object.values(foundationGroups).every(
    (issues) => !issues.some((i) => i.level === 'fail'),
  );
  console.log(`${BOLD}Foundation Coverage${RESET} — ${foundationCoveragePass ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`}`);
  for (const [checkName, issues] of Object.entries(foundationGroups)) {
    const checkPass = !issues.some((i) => i.level === 'fail');
    console.log(`  ${checkPass ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`} ${checkName}`);
    if (issues.length) printIssues(issues);
  }
  console.log('');

  console.log(`${BOLD}Step 4: regenerating Storybook docs${RESET} (npm run build-storybook)`);
  const buildResult = regenerateStorybookDocs();
  if (buildResult.pass) {
    console.log(`  ${GREEN}PASS${RESET}  Storybook docs build cleanly\n`);
  } else {
    console.log(`  ${RED}FAIL${RESET}  Storybook build failed:`);
    console.log(buildResult.output.split('\n').map((l) => `    ${l}`).join('\n'));
    console.log('');
  }

  if (generatedAnyDocs) {
    console.log(
      `${YELLOW}Note: one or more ComponentName.docs.ts files were auto-generated this run with TODO placeholders — see Documentation findings above.${RESET}\n`,
    );
  }

  // Step 5: report PASS / FAIL
  console.log(`${BOLD}Step 5: report${RESET}\n`);
  printDotPaddedGroup(componentResults.map((r) => [r.component, r.overall]));
  console.log('');

  const categoryPass = {
    'Token Compliance': tokenParityPass && componentResults.every((r) => r.checks.tokenCompliance.pass),
    Accessibility: componentResults.every((r) => r.checks.accessibility.pass),
    'Storybook Coverage': componentResults.every((r) => r.checks.storybookCoverage.pass),
    'Documentation Coverage': componentResults.every((r) => r.checks.documentationCoverage.pass),
    'Foundation Coverage': foundationCoveragePass,
  };
  printDotPaddedGroup(Object.entries(categoryPass));
  console.log('');

  const overallStatus = Object.values(categoryPass).every(Boolean) && buildResult.pass;
  printDotPaddedGroup([['Overall Status', overallStatus]]);
  console.log('');

  writeConsolidatedReport(componentResults, categoryPass, overallStatus);

  console.log(
    `${DIM}Note: this is a static heuristic check. It does not compare rendered output against Figma —${RESET}`,
  );
  console.log(`${DIM}run /prompts/validate-component.md for design-parity verification.${RESET}\n`);

  process.exit(overallStatus ? 0 : 1);
}

// Only auto-run the full CLI (including the slow build-storybook step and
// writing validation.json/foundations data) when this file is executed
// directly — not when another script imports its check functions (see
// scripts/generate-dashboard-data.js), which must stay read-only.
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
