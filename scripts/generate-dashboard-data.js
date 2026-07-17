#!/usr/bin/env node
/**
 * generate-dashboard-data — builds src/design-docs/dashboard-data.generated.json,
 * the single real-data source for the DesignOps dashboard (src/App.tsx).
 *
 * Reuses design-sync.js's own check functions (imported, not reimplemented)
 * so the dashboard's error counts can never drift from what
 * `npm run design-sync` itself finds. Read-only against the working tree —
 * unlike design-sync.js, it never writes docs stubs, validation.json, or
 * triggers a Storybook build.
 *
 * Cycle-time and PR-link data comes from local git history (merge commits +
 * a first-parent walk), not the GitHub API — no `gh` auth required to
 * regenerate this file.
 *
 * Usage: npm run dashboard-data
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  discoverComponents,
  parseThemeTokenNames,
  checkTokenCompliance,
  checkAccessibility,
  checkStorybookCoverage,
  checkDocumentation,
  readDocsFile,
  extractTokensUsed,
} from './design-sync.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS_DIR = join(ROOT, 'src', 'components');
const TOKENS_CSS_PATH = join(ROOT, 'src', 'styles', 'tokens.css');
const OUT_PATH = join(ROOT, 'src', 'design-docs', 'dashboard-data.generated.json');

const GITHUB_REPO_URL = 'https://github.com/MarkM00n/runabout-design-system';
const STORYBOOK_BASE_URL = 'https://markm00n.github.io/runabout-design-system/';

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

// ---------------------------------------------------------------------------
// git-derived PR / cycle-time history. Every merge into main in this repo is
// a "Merge pull request #N" commit produced by a fast-forward-able worktree
// branch — the second parent is the tip of that branch, so diffing against
// the first parent isolates exactly the commits that branch contributed.
// ---------------------------------------------------------------------------

function loadMergeHistory() {
  const hashes = git(['log', '--merges', '--first-parent', 'HEAD', '--format=%H']).split('\n').filter(Boolean);
  const merges = hashes.map((hash) => {
    const [subject, mergedAt] = git(['log', '-1', `--format=%s%n%cI`, hash]).split('\n');
    const parents = git(['log', '-1', '--format=%P', hash]).split(' ').filter(Boolean);
    const [parent1, parent2] = parents;
    const prMatch = subject.match(/Merge pull request #(\d+)/);
    let firstCommitAt = null;
    if (parent2) {
      const branchCommits = git(['log', `${parent1}..${parent2}`, '--format=%aI']).split('\n').filter(Boolean);
      firstCommitAt = branchCommits[branchCommits.length - 1] ?? null;
    }
    return {
      hash,
      subject,
      mergedAt,
      prNumber: prMatch ? Number(prMatch[1]) : null,
      firstCommitAt,
    };
  });
  return merges.reverse(); // oldest first
}

// Earliest merge (in mainline order) that contains `commit`.
function introducingMerge(commit, merges) {
  for (const merge of merges) {
    try {
      git(['merge-base', '--is-ancestor', commit, merge.hash]);
      return merge;
    } catch {
      // not an ancestor of this merge — keep looking
    }
  }
  return null;
}

// Oldest commit that added `relativePath` (handles the rare rename case via --follow).
function firstAddCommit(relativePath) {
  const hashes = git(['log', '--follow', '--diff-filter=A', '--format=%H', '--', relativePath])
    .split('\n')
    .filter(Boolean);
  return hashes[hashes.length - 1] ?? null;
}

// ---------------------------------------------------------------------------
// Validation, reusing design-sync's own (pure, side-effect-free) check
// functions so this can never report a different number than the CLI does.
// ---------------------------------------------------------------------------

function runValidationChecks() {
  const components = discoverComponents();
  const cssRaw = existsSync(TOKENS_CSS_PATH) ? readFileSync(TOKENS_CSS_PATH, 'utf8') : '';
  const cssTokenNames = parseThemeTokenNames(cssRaw);

  const summary = {
    tokenCompliance: { fail: 0, warn: 0 },
    accessibility: { fail: 0, warn: 0 },
    storybookCoverage: { fail: 0, warn: 0 },
    documentationCoverage: { fail: 0, warn: 0 },
  };

  const perComponent = {};

  for (const name of components) {
    const dir = join(COMPONENTS_DIR, name);
    const componentSource = readFileSync(join(dir, `${name}.tsx`), 'utf8');
    const storiesPath = join(dir, `${name}.stories.tsx`);
    const storiesSource = existsSync(storiesPath) ? readFileSync(storiesPath, 'utf8') : '';

    const tokenIssues = checkTokenCompliance(componentSource);
    const a11yIssues = checkAccessibility(componentSource);
    const storybookIssues = existsSync(storiesPath)
      ? checkStorybookCoverage(name, dir, componentSource, storiesSource)
      : [{ level: 'fail', message: `No ${name}.stories.tsx found.` }];
    const tokensUsed = extractTokensUsed(componentSource, cssTokenNames);
    const docsResult = readDocsFile(dir, name);
    const docIssues = checkDocumentation(name, dir, storiesSource, docsResult, tokensUsed);

    const tally = (issues, key) => {
      for (const issue of issues) summary[key][issue.level] += 1;
    };
    tally(tokenIssues, 'tokenCompliance');
    tally(a11yIssues, 'accessibility');
    tally(storybookIssues, 'storybookCoverage');
    tally(docIssues, 'documentationCoverage');

    perComponent[name] = {
      tokenCompliance: !tokenIssues.some((i) => i.level === 'fail'),
      accessibility: !a11yIssues.some((i) => i.level === 'fail'),
      storybookCoverage: !storybookIssues.some((i) => i.level === 'fail'),
      documentationCoverage: !docIssues.some((i) => i.level === 'fail'),
      warnings: {
        tokenCompliance: tokenIssues.filter((i) => i.level === 'warn').length,
        accessibility: a11yIssues.filter((i) => i.level === 'warn').length,
        storybookCoverage: storybookIssues.filter((i) => i.level === 'warn').length,
        documentationCoverage: docIssues.filter((i) => i.level === 'warn').length,
      },
    };
  }

  return { summary, perComponent, components };
}

// ---------------------------------------------------------------------------
// Assemble
// ---------------------------------------------------------------------------

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function main() {
  const { summary, perComponent, components } = runValidationChecks();
  const merges = loadMergeHistory();

  const componentRows = [];
  const cycleTimes = [];

  for (const name of components) {
    const dir = join(COMPONENTS_DIR, name);
    const validationPath = join(dir, `${name}.validation.json`);
    const validation = existsSync(validationPath) ? JSON.parse(readFileSync(validationPath, 'utf8')) : null;

    const relPath = `src/components/${name}/${name}.tsx`;
    const addCommit = firstAddCommit(relPath);
    const merge = addCommit ? introducingMerge(addCommit, merges) : null;

    let cycleTimeSeconds = null;
    if (merge && merge.firstCommitAt) {
      cycleTimeSeconds = Math.round((new Date(merge.mergedAt).getTime() - new Date(merge.firstCommitAt).getTime()) / 1000);
      cycleTimes.push(cycleTimeSeconds);
    }

    componentRows.push({
      name,
      tokenCompliance: perComponent[name].tokenCompliance,
      accessibility: perComponent[name].accessibility,
      storybookCoverage: perComponent[name].storybookCoverage,
      documentationCoverage: perComponent[name].documentationCoverage,
      warnings: perComponent[name].warnings,
      overall: Object.values(perComponent[name]).slice(0, 4).every(Boolean),
      lastValidated: validation?.lastValidated ?? null,
      storybookUrl: `${STORYBOOK_BASE_URL}?path=/docs/components-${name.toLowerCase()}--docs`,
      pr: merge ? { number: merge.prNumber, url: `${GITHUB_REPO_URL}/pull/${merge.prNumber}` } : null,
      firstCommitAt: merge?.firstCommitAt ?? null,
      mergedAt: merge?.mergedAt ?? null,
      cycleTimeSeconds,
    });
  }

  const averageCycleTimeSeconds = cycleTimes.length
    ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length)
    : null;

  const data = {
    generatedAt: new Date().toISOString(),
    methodologyNotes: {
      cycleTime:
        "Per component: time from the first commit on the PR branch that introduced the component's .tsx file, " +
        "to that PR's merge time — from local git history (merge commits + first-parent walk), not GitHub API " +
        'timestamps. Follow-on PRs that later touched an already-shipped component (fixes, doc generation) are ' +
        'not counted a second time.',
      firstTimePassRate:
        'Omitted: no historical validation run log exists. ComponentName.validation.json is overwritten in place ' +
        'on every design-sync run, and for all 6 components here that file did not exist until PR #5 (the ' +
        'Documentation Generation stage) — added after every component was already merged. There is no ' +
        'recoverable record of what a first design-sync run against these components would have found.',
      errorsByCheckType:
        'Reflects the design-sync checks run live when this file was generated, not a historical/cumulative ' +
        "count — design-sync overwrites its results each run and doesn't keep a log of past findings.",
    },
    totals: {
      totalComponents: components.length,
      averageCycleTimeSeconds,
      averageCycleTimeLabel: averageCycleTimeSeconds != null ? formatDuration(averageCycleTimeSeconds) : null,
    },
    validationSummary: summary,
    components: componentRows,
    links: {
      githubRepoUrl: GITHUB_REPO_URL,
      storybookBaseUrl: STORYBOOK_BASE_URL,
    },
  };

  writeFileSync(OUT_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(`Wrote ${OUT_PATH.replace(ROOT + '/', '')}`);
}

main();
