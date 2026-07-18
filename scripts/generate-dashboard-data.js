#!/usr/bin/env node
/**
 * generate-dashboard-data — builds src/design-docs/dashboard-data.generated.json,
 * the data source for the DesignOps dashboard (src/App.tsx).
 *
 * Validation numbers (pass/fail, open issues, caught-and-fixed history) are
 * read verbatim from src/design-docs/validation-report.generated.json —
 * design-sync.js's own output — never recomputed here. That file is the
 * single source of truth every surface (dashboard, Storybook badges, PR
 * comments) reads from; this script's only original computation is cycle
 * time and PR links, which the validation report doesn't cover.
 *
 * Cycle-time and PR-link data comes from local git history (merge commits +
 * a first-parent walk), not the GitHub API — no `gh` auth required to
 * regenerate this file.
 *
 * Usage: npm run dashboard-data (run design-sync first so the validation
 * report is current — this script does not run it for you)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VALIDATION_REPORT_PATH = join(ROOT, 'src', 'design-docs', 'validation-report.generated.json');
const FOUNDATIONS_DATA_PATH = join(ROOT, 'src', 'design-docs', 'foundations-data.generated.json');
const OUT_PATH = join(ROOT, 'src', 'design-docs', 'dashboard-data.generated.json');

// Counts every token across every Foundation category (color, typography,
// spacing, radius, motion, breakpoint, shadow) — same file the Foundation
// Storybook pages render from, so this can't drift from what's actually
// documented there.
function countDesignTokens() {
  if (!existsSync(FOUNDATIONS_DATA_PATH)) return null;
  const foundations = JSON.parse(readFileSync(FOUNDATIONS_DATA_PATH, 'utf8'));
  const categories = ['color', 'typography', 'spacing', 'radius', 'motion', 'breakpoint', 'shadow'];
  return categories.reduce((sum, key) => sum + (Array.isArray(foundations[key]) ? foundations[key].length : 0), 0);
}

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
// Assemble
// ---------------------------------------------------------------------------

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function main() {
  if (!existsSync(VALIDATION_REPORT_PATH)) {
    console.error(
      `${VALIDATION_REPORT_PATH.replace(ROOT + '/', '')} not found — run \`npm run design-sync\` first, it writes this file.`,
    );
    process.exit(1);
  }
  const validationReport = JSON.parse(readFileSync(VALIDATION_REPORT_PATH, 'utf8'));
  const merges = loadMergeHistory();

  const validationSummary = {
    tokenCompliance: { fail: 0, warn: 0 },
    accessibility: { fail: 0, warn: 0 },
    storybookCoverage: { fail: 0, warn: 0 },
    documentationCoverage: { fail: 0, warn: 0 },
  };

  const componentRows = [];
  const cycleTimes = [];

  for (const component of validationReport.components) {
    const name = component.component;

    for (const [key, check] of Object.entries(component.checks)) {
      validationSummary[key].fail += check.fail;
      validationSummary[key].warn += check.warn;
    }

    const relPath = `src/components/${name}/${name}.tsx`;
    const addCommit = firstAddCommit(relPath);
    const merge = addCommit ? introducingMerge(addCommit, merges) : null;

    let cycleTimeSeconds = null;
    if (merge && merge.firstCommitAt) {
      cycleTimeSeconds = Math.round((new Date(merge.mergedAt).getTime() - new Date(merge.firstCommitAt).getTime()) / 1000);
      cycleTimes.push(cycleTimeSeconds);
    }

    const openCount = Object.values(component.checks).reduce((sum, c) => sum + c.open.length, 0);

    componentRows.push({
      name,
      overall: component.overall,
      checks: component.checks,
      openCount,
      fixedCount: component.history.length,
      history: component.history,
      lastValidated: component.lastValidated,
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

  const totalOpenIssues = componentRows.reduce((sum, c) => sum + c.openCount, 0);
  const totalCaughtAndFixed = componentRows.reduce((sum, c) => sum + c.fixedCount, 0);
  const totalDesignTokens = countDesignTokens();

  const data = {
    generatedAt: new Date().toISOString(),
    validationReportGeneratedAt: validationReport.generatedAt,
    methodologyNotes: {
      cycleTime:
        "Per component: time from the first commit on the PR branch that introduced the component's .tsx file, " +
        "to that PR's merge time — from local git history (merge commits + first-parent walk), not GitHub API " +
        'timestamps. Follow-on PRs that later touched an already-shipped component (fixes, doc generation) are ' +
        'not counted a second time.',
      firstTimePassRate:
        'Omitted: no historical validation run log exists from before this repo tracked issue-level detail. ' +
        'ComponentName.validation.json only stored pass/fail booleans (no history) until this dashboard shipped, ' +
        "and didn't exist at all until PR #5 — added after all 6 original components were already merged. " +
        '"Caught & fixed" below is the honest, forward-looking replacement: real, mechanically tracked from here ' +
        'on, starting at 0 for every component rather than backfilled from memory.',
      caughtAndFixed:
        'A component\'s "Caught & fixed" count only grows when a design-sync run finds an issue gone that was ' +
        'open in the previous run — never asserted, always a real before/after diff. It starts at 0 for all 6 ' +
        'original components, since no prior run recorded issue-level detail to diff against.',
    },
    totals: {
      totalComponents: validationReport.components.length,
      averageCycleTimeSeconds,
      averageCycleTimeLabel: averageCycleTimeSeconds != null ? formatDuration(averageCycleTimeSeconds) : null,
      totalOpenIssues,
      totalCaughtAndFixed,
      totalDesignTokens,
    },
    validationSummary,
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
