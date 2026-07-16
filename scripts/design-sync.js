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

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

function discoverComponents() {
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

function parseThemeTokenNames(css) {
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

function checkTokenCompliance(source) {
  const issues = [];
  const codeOnly = stripComments(source);

  DANGEROUS_SCALE_RE.lastIndex = 0;
  let match;
  while ((match = DANGEROUS_SCALE_RE.exec(codeOnly))) {
    issues.push({
      level: 'fail',
      message: `Uses Tailwind's bare numeric scale "${match[0]}" — this renders 1.125x too large on this repo's 18px root font-size. Use an arbitrary px value (e.g. h-[24px]) or a token instead.`,
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
          message: `Raw color "${hexMatch[0]}" on line ${i + 1} — has a nearby comment; confirm it documents an unbound Figma value rather than just describing the code.`,
        });
      } else if (hasFileLevelJustification) {
        issues.push({
          level: 'warn',
          message: `Raw color "${hexMatch[0]}" on line ${i + 1} — no comment on this specific line, but the file has a doc comment justifying unbound values. Consider a per-line note for traceability.`,
        });
      } else {
        issues.push({
          level: 'fail',
          message: `Raw color "${hexMatch[0]}" on line ${i + 1} with no nearby or file-level comment explaining why it isn't a token.`,
        });
      }
    }
  });

  return issues;
}

// Scans a component's source for usage of registered tokens (by suffix
// match against tokens.css's @theme names) so "Design Tokens Used" in the
// docs page is auto-derived from real usage, not hand-maintained.
function extractTokensUsed(componentSource, cssTokenNames) {
  const codeOnly = stripComments(componentSource);
  const used = new Set();
  const categoryPrefixes = ['color-', 'spacing-', 'radius-', 'text-', 'font-'];

  for (const fullName of cssTokenNames) {
    if (fullName.includes('--')) continue; // skip --text-x--line-height companions
    let suffix = fullName;
    for (const prefix of categoryPrefixes) {
      if (fullName.startsWith(prefix)) {
        suffix = fullName.slice(prefix.length);
        break;
      }
    }
    const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`[a-z]+-${escaped}\\b`, 'i');
    if (re.test(codeOnly)) {
      used.add(fullName);
    }
  }
  return [...used].sort();
}

// ---------------------------------------------------------------------------
// 1b. Accessibility (heuristic — see docs/design-system-rules.md § Accessibility)
// ---------------------------------------------------------------------------

function checkAccessibility(rawSource) {
  const issues = [];
  const source = stripComments(rawSource);

  if (/<div[^>]*\bonClick\b/.test(source)) {
    issues.push({
      level: 'fail',
      message: 'Found onClick on a <div> — interactive behavior should use a real native element, not a styled div.',
    });
  }

  if (/\bfocus:/.test(source) && !/focus-visible:/.test(source)) {
    issues.push({
      level: 'fail',
      message: "Uses `focus:` without any `focus-visible:` — focus rings should key off :focus-visible so mouse clicks don't show a keyboard-only ring.",
    });
  }

  const hasDisabledPointerEventsGuard = /(?:^|[\s'"])(?:disabled|has-\[:disabled\]):pointer-events-none\b/.test(source);
  if (/\bdisabled\b/.test(source) && !hasDisabledPointerEventsGuard) {
    issues.push({
      level: 'warn',
      message: 'Component references `disabled` but no `disabled:pointer-events-none` (or `has-[:disabled]:pointer-events-none`) found — hover states may visually leak through on a disabled control.',
    });
  }

  const svgBlocks = source.match(/<svg[\s\S]*?<\/svg>/g) ?? [];
  svgBlocks.forEach((block, idx) => {
    if (!/aria-hidden/.test(block)) {
      issues.push({
        level: 'warn',
        message: `<svg> block #${idx + 1} has no aria-hidden — confirm it's purely decorative, or add aria-hidden="true".`,
      });
    }
  });

  if (/type=["'](?:checkbox|radio)["']/.test(source) && !/sr-only/.test(source)) {
    issues.push({
      level: 'warn',
      message: 'Custom checkbox/radio input found without `sr-only` — if it\'s visually replaced with custom styling, the real input should be sr-only, not hidden or removed.',
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 1c. Storybook coverage
// ---------------------------------------------------------------------------

function checkStorybookCoverage(name, dir, componentSource, storiesSource) {
  const issues = [];
  const indexPath = join(dir, 'index.ts');

  if (!existsSync(indexPath)) {
    issues.push({ level: 'fail', message: 'No index.ts barrel export found.' });
  }

  if (!/tags:\s*\[[^\]]*['"]autodocs['"]/.test(storiesSource)) {
    issues.push({ level: 'fail', message: "Missing `tags: ['autodocs']` in story meta." });
  }

  const hasDisabledProp = /\bdisabled\b/.test(stripComments(componentSource));
  const hasDisabledStory = /export const Disabled\b/i.test(storiesSource);
  if (hasDisabledProp && !hasDisabledStory) {
    issues.push({ level: 'fail', message: 'Component supports `disabled` but no `Disabled` story export was found.' });
  }

  const storyExportCount = (storiesSource.match(/export const \w+: Story/g) ?? []).length;
  if (storyExportCount === 0) {
    issues.push({ level: 'fail', message: 'No story exports found.' });
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

function readDocsFile(dir, name) {
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

function checkDocumentation(name, dir, storiesSource, docsResult, tokensUsed) {
  const issues = [];
  const { exists, data } = docsResult;

  if (!exists) {
    issues.push({ level: 'fail', message: `No ${name}.docs.ts found — description/usage/do-dont/accessibility content is missing.` });
  } else if (!data) {
    issues.push({ level: 'fail', message: `${name}.docs.ts exists but its docs object could not be parsed.` });
  } else {
    const hasTodo = JSON.stringify(data).includes('TODO');
    const level = hasTodo ? 'warn' : 'fail';
    const todoNote = hasTodo ? ' (auto-generated stub — needs human authoring)' : '';

    if (!data.description?.trim()) {
      issues.push({ level, message: `Description is missing or a TODO placeholder${todoNote}.` });
    }
    if (!data.usageGuidelines?.length) {
      issues.push({ level, message: `Usage guidance is missing or a TODO placeholder${todoNote}.` });
    }
    if (!data.accessibilityNotes?.length) {
      issues.push({ level, message: `Accessibility notes are missing or a TODO placeholder${todoNote}.` });
    }
    if (!data.codeExample?.trim() || data.codeExample.includes('TODO')) {
      issues.push({ level: 'warn', message: `Code example is missing or a TODO placeholder${todoNote}.` });
    }
  }

  if (tokensUsed.length === 0) {
    issues.push({ level: 'warn', message: 'No registered design tokens detected in use — "Design Tokens Used" will be empty.' });
  }

  if (!/tags:\s*\[[^\]]*['"]autodocs['"]/.test(storiesSource)) {
    issues.push({ level: 'fail', message: "Storybook Autodocs not configured — missing tags: ['autodocs']." });
  }

  const storyExportCount = (storiesSource.match(/export const \w+: Story/g) ?? []).length;
  if (storyExportCount === 0) {
    issues.push({ level: 'fail', message: 'Required stories are missing — no story exports found.' });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Validation report: ComponentName.validation.json, consumed by DocsPage.tsx
// for the "Validation Status" section and DesignOps metadata block.
// ---------------------------------------------------------------------------

function writeValidationReport(dir, report) {
  writeFileSync(join(dir, `${report.component}.validation.json`), JSON.stringify(report, null, 2) + '\n');
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
// whatever comment immediately precedes it. A comment stays "pending" and
// applies to every subsequent token until a blank line resets it or a new
// comment replaces it — matching how tokens.css's own multi-token comment
// blocks are written (e.g. one comment covering all 4 spacing tokens).
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
  const categoryPrefixes = ['color-', 'spacing-', 'radius-', 'text-', 'font-'];
  let suffix = cssName;
  for (const prefix of categoryPrefixes) {
    if (cssName.startsWith(prefix)) {
      suffix = cssName.slice(prefix.length);
      break;
    }
  }
  const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`[a-z]+-${escaped}\\b`, 'i');
  return componentSources.filter(({ source }) => re.test(stripComments(source))).map(({ name }) => name);
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
    for (const [key, entry] of Object.entries(entries)) {
      const cssName = `color-${group}-${key}`;
      const specificNote = entry.note || cssComments[cssName];
      data.color.push({
        type: TOKEN_TYPE_LABELS.color,
        name: `--${cssName}`,
        tokenPath: `color.${group}.${key}`,
        value: entry.value,
        usage: specificNote || genericUsageFor('color', group),
        documented: Boolean(specificNote),
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

    const tokenIssues = checkTokenCompliance(componentSource);
    const a11yIssues = checkAccessibility(componentSource);
    const storybookIssues = existsSync(storiesPath)
      ? checkStorybookCoverage(name, dir, componentSource, storiesSource)
      : [{ level: 'fail', message: `No ${name}.stories.tsx found.` }];

    // Step 3: generate missing documentation sections before validating them,
    // so a component missing docs.ts gets scaffolded and re-checked in the
    // same run rather than needing a second invocation.
    const generated = generateDocsStub(name, dir, componentSource);
    if (generated) generatedAnyDocs = true;

    const tokensUsed = extractTokensUsed(componentSource, cssTokenNames);
    const docsResult = readDocsFile(dir, name);
    const docIssues = checkDocumentation(name, dir, storiesSource, docsResult, tokensUsed);

    const tokenCompliancePass = !tokenIssues.some((i) => i.level === 'fail');
    const accessibilityPass = !a11yIssues.some((i) => i.level === 'fail');
    const storybookCoveragePass = !storybookIssues.some((i) => i.level === 'fail');
    const documentationCoveragePass = !docIssues.some((i) => i.level === 'fail');
    const overall = tokenCompliancePass && accessibilityPass && storybookCoveragePass && documentationCoveragePass;

    const report = {
      component: name,
      lastValidated: new Date().toISOString().slice(0, 10),
      tokenCompliance: tokenCompliancePass,
      accessibility: accessibilityPass,
      storybookCoverage: storybookCoveragePass,
      documentationCoverage: documentationCoveragePass,
      overall,
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
    'Token Compliance': tokenParityPass && componentResults.every((r) => r.tokenCompliance),
    Accessibility: componentResults.every((r) => r.accessibility),
    'Storybook Coverage': componentResults.every((r) => r.storybookCoverage),
    'Documentation Coverage': componentResults.every((r) => r.documentationCoverage),
    'Foundation Coverage': foundationCoveragePass,
  };
  printDotPaddedGroup(Object.entries(categoryPass));
  console.log('');

  const overallStatus = Object.values(categoryPass).every(Boolean) && buildResult.pass;
  printDotPaddedGroup([['Overall Status', overallStatus]]);
  console.log('');

  console.log(
    `${DIM}Note: this is a static heuristic check. It does not compare rendered output against Figma —${RESET}`,
  );
  console.log(`${DIM}run /prompts/validate-component.md for design-parity verification.${RESET}\n`);

  process.exit(overallStatus ? 0 : 1);
}

run();
