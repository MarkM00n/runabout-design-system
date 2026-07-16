#!/usr/bin/env node
/**
 * design-sync — static validation of src/components/ against the rules in
 * docs/design-system-rules.md.
 *
 * Checks: token compliance, accessibility (heuristic), Storybook coverage.
 * Deliberately does NOT attempt design-parity checks (comparing rendered
 * output against Figma) — that requires a live render + the Figma MCP
 * tools and is an LLM-driven process, not something a static script can
 * do. See prompts/validate-component.md for that half of the picture.
 *
 * Usage: npm run design-sync
 * Exit code: 0 if every component passes, 1 if anything fails.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
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
      // one level of nesting, e.g. color.action.primary
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

  // Only cross-check color/spacing/radius — typography's JSON shape (fontSize/
  // lineHeight/fontFamily per named style) doesn't map 1:1 onto the CSS
  // custom-property names, so it's excluded rather than producing noisy
  // false positives.
  const cssColor = [...cssNames].filter((n) => n.startsWith('color-')).map((n) => n.slice('color-'.length));
  const cssSpacing = [...cssNames].filter((n) => n.startsWith('spacing-')).map((n) => n.slice('spacing-'.length));
  const cssRadius = [...cssNames].filter((n) => n.startsWith('radius-')).map((n) => n.slice('radius-'.length));

  const jsonColor = flattenJsonCategory(json, 'color');
  const jsonSpacing = new Set(Object.keys(json.spacing ?? {}));
  const jsonRadius = new Set(Object.keys(json.radius ?? {}));

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

  return issues;
}

// ---------------------------------------------------------------------------
// 1. Token compliance (per component)
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
const DANGEROUS_SCALE_RE =
  /\b(?:h|w|gap|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|top|right|bottom|left|inset)-([1-9]\d*)\b/g;
const RAW_HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const DOC_COMMENT_KEYWORDS = /unbound|not bound|literal|not tokeni[sz]ed|raw (?:value|hex|color|px)/i;

// Blanks out comment contents (keeping newlines, so line numbers reported
// to the user still line up with the original file) so that mentioning a
// dangerous class name or a hex value *inside a comment* — e.g. Button's own
// "rather than Tailwind's h-12/h-8 scale" explanation — doesn't get flagged
// as if it were real usage. This is a regex-based approximation, not a full
// parser: it can mis-strip a `//` inside a string literal, which is an
// accepted tradeoff for a lightweight static check.
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

  // A hex mentioned only in a comment (documentation, not usage) shouldn't
  // need a per-line justification — but a file-level doc comment explaining
  // "these values are deliberately unbound" is still valid justification
  // for a hex that *is* real usage, even if it isn't immediately adjacent.
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

// ---------------------------------------------------------------------------
// 2. Accessibility (heuristic — see docs/design-system-rules.md § Accessibility)
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

  if (/\bdisabled\b/.test(source) && !/disabled:pointer-events-none/.test(source)) {
    issues.push({
      level: 'warn',
      message: 'Component references `disabled` but no `disabled:pointer-events-none` found — hover states may visually leak through on a disabled control.',
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
// 3. Storybook coverage
// ---------------------------------------------------------------------------

function checkStorybookCoverage(name, dir, componentSource) {
  const issues = [];
  const storiesPath = join(dir, `${name}.stories.tsx`);
  const indexPath = join(dir, 'index.ts');

  if (!existsSync(storiesPath)) {
    issues.push({ level: 'fail', message: `No ${name}.stories.tsx found.` });
    return issues;
  }
  if (!existsSync(indexPath)) {
    issues.push({ level: 'fail', message: 'No index.ts barrel export found.' });
  }

  const storiesSource = readFileSync(storiesPath, 'utf8');

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
// Reporting
// ---------------------------------------------------------------------------

function printIssues(issues) {
  for (const issue of issues) {
    const color = issue.level === 'fail' ? RED : YELLOW;
    const label = issue.level === 'fail' ? 'FAIL' : 'WARN';
    console.log(`    ${color}${label}${RESET}  ${issue.message}`);
  }
}

function run() {
  const components = discoverComponents();

  console.log(`${BOLD}design-sync${RESET} — reviewing ${components.length} component(s) in src/components/\n`);

  if (components.length === 0) {
    console.log(`${YELLOW}No components found under src/components/.${RESET}`);
    process.exit(1);
  }

  let anyFail = false;

  console.log(`${BOLD}Token parity${RESET} (tokens.css <-> tokens.json)`);
  const parityIssues = checkTokenParity();
  if (parityIssues.length === 0) {
    console.log(`  ${GREEN}PASS${RESET}  tokens.css and tokens.json are in sync\n`);
  } else {
    printIssues(parityIssues);
    if (parityIssues.some((i) => i.level === 'fail')) anyFail = true;
    console.log('');
  }

  for (const name of components) {
    const dir = join(COMPONENTS_DIR, name);
    const componentSource = readFileSync(join(dir, `${name}.tsx`), 'utf8');

    const tokenIssues = checkTokenCompliance(componentSource);
    const a11yIssues = checkAccessibility(componentSource);
    const storybookIssues = checkStorybookCoverage(name, dir, componentSource);

    const allIssues = [...tokenIssues, ...a11yIssues, ...storybookIssues];
    const componentFails = allIssues.some((i) => i.level === 'fail');
    if (componentFails) anyFail = true;

    const status = componentFails ? `${RED}FAIL${RESET}` : `${GREEN}PASS${RESET}`;
    console.log(`${BOLD}${name}${RESET} — ${status}`);

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
    if (allIssues.length === 0) {
      console.log(`  ${GREEN}PASS${RESET}  no issues found`);
    }
    console.log('');
  }

  console.log(
    `${DIM}Note: this is a static heuristic check. It does not compare rendered output against Figma —${RESET}`,
  );
  console.log(`${DIM}run /prompts/validate-component.md for design-parity verification.${RESET}\n`);

  if (anyFail) {
    console.log(`${BOLD}${RED}design-sync: FAIL${RESET}`);
    process.exit(1);
  } else {
    console.log(`${BOLD}${GREEN}design-sync: PASS${RESET}`);
    process.exit(0);
  }
}

run();
