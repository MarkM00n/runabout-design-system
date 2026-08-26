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
 * Cycle-time and PR-link data comes from local git history (a first-parent
 * walk over both merge commits and squash commits), not the GitHub API — no
 * `gh` auth required to regenerate this file. Squash-merged PRs additionally
 * need `refs/pull/N/head`, which is a plain `git fetch` against origin using
 * the same credentials as a clone — still no `gh`, still no API token. See
 * loadMergeHistory() for why.
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

function gitQuiet(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

// ---------------------------------------------------------------------------
// git-derived PR / cycle-time history.
//
// This repo has used TWO merge strategies, and the walk has to understand
// both or it silently drops everything shipped under the newer one:
//
//   1. Merge commits (PRs #1–#45, up to 2026-07-22) — "Merge pull request #N"
//      with two parents. The second parent is the tip of the PR branch, so
//      `parent1..parent2` isolates exactly the commits that branch
//      contributed, and the oldest of those is the first commit.
//
//   2. Squash merges (PR #46 onward) — a single-parent commit whose subject
//      ends "(#N)". The branch's individual commits are NOT in main's history
//      at all, and GitHub stamps the squash commit's *author* date with the
//      merge time, not the branch's first commit — so there is nothing local
//      to read a real start time from. Tab (PR #62) is the case that exposed
//      this: `git log --merges` found no merge commit containing it, so its
//      PR link, first-commit time, merged time and cycle time all came out
//      null, and it vanished from the cycle-time sample entirely.
//
// The real commits for a squash-merged PR do survive, in GitHub's permanent
// `refs/pull/N/head` ref — kept forever, even after the branch is deleted.
// Fetching that ref is a plain `git fetch` against origin (same credentials
// as the clone), which keeps the "no `gh`, no API token" property in the
// header comment intact. Resolution is lazy and memoised: only the handful of
// PRs that actually introduced a component get fetched, not all 29.
// ---------------------------------------------------------------------------

// Cached under a namespaced local ref so a second run — and any run offline
// after a first successful one — resolves without touching the network.
function prHeadRef(prNumber) {
  const localRef = `refs/dashboard-pr/${prNumber}`;
  try {
    gitQuiet(['rev-parse', '--verify', '--quiet', `${localRef}^{commit}`]);
    return localRef;
  } catch {
    // not cached yet — fall through and fetch
  }
  try {
    gitQuiet(['fetch', '--quiet', 'origin', `+refs/pull/${prNumber}/head:${localRef}`]);
    return localRef;
  } catch {
    return null;
  }
}

// First commit on a squash-merged PR's branch. `mergeHash^` is where that
// branch forked from main, so merge-base of the two gives the fork point and
// `forkPoint..prHead` is the branch's own commits, oldest last.
function squashFirstCommitAt(prNumber, mergeHash) {
  const ref = prHeadRef(prNumber);
  if (!ref) {
    console.warn(
      `  warn: PR #${prNumber} was squash-merged and refs/pull/${prNumber}/head could not be fetched — ` +
        'its cycle time will be null and excluded from the mean/median (not counted as zero).',
    );
    return null;
  }
  try {
    const forkPoint = git(['merge-base', ref, `${mergeHash}^`]);
    const branchCommits = git(['log', `${forkPoint}..${ref}`, '--format=%aI']).split('\n').filter(Boolean);
    return branchCommits[branchCommits.length - 1] ?? null;
  } catch {
    return null;
  }
}

function loadMergeHistory() {
  const RECORD = '\x1e';
  const FIELD = '\x1f';
  const raw = git(['log', '--first-parent', 'HEAD', `--format=%H${FIELD}%P${FIELD}%cI${FIELD}%s${RECORD}`]);

  const merges = raw
    .split(RECORD)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, parentList, mergedAt, subject] = record.split(FIELD);
      const [parent1, parent2] = parentList.split(' ').filter(Boolean);

      const mergeMatch = subject.match(/Merge pull request #(\d+)/);
      if (mergeMatch && parent2) {
        const branchCommits = git(['log', `${parent1}..${parent2}`, '--format=%aI']).split('\n').filter(Boolean);
        return {
          hash,
          subject,
          mergedAt,
          prNumber: Number(mergeMatch[1]),
          firstCommitAt: branchCommits[branchCommits.length - 1] ?? null,
          strategy: 'merge-commit',
        };
      }

      // Squash merge: single parent, subject ends "(#N)". Excludes the
      // deploy workflow's own "chore: regenerate derived data [skip ci]"
      // commits, which carry no PR number.
      const squashMatch = !parent2 && subject.match(/\(#(\d+)\)$/);
      if (squashMatch) {
        return {
          hash,
          subject,
          mergedAt,
          prNumber: Number(squashMatch[1]),
          firstCommitAt: undefined, // resolved lazily — see resolveFirstCommitAt
          strategy: 'squash',
        };
      }

      return null;
    })
    .filter(Boolean);

  return merges.reverse(); // oldest first
}

// Squash entries defer their (network-touching) lookup until we know the
// merge actually introduced a component, so an unrelated PR never costs a
// fetch. `undefined` means unresolved; `null` means resolved-but-unavailable.
function resolveFirstCommitAt(merge) {
  if (merge.firstCommitAt === undefined) {
    merge.firstCommitAt = squashFirstCommitAt(merge.prNumber, merge.hash);
  }
  return merge.firstCommitAt;
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

// Wall-clock, not working hours. Sub-hour durations drop the leading "0h "
// — the real PR #2 figure is 36 minutes, and "0h 36m" reads like a broken
// number rather than a fast one.
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

// Mean of an already-null-filtered sample. Returns null for an empty sample
// rather than NaN.
function mean(values) {
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

// Median of an already-null-filtered sample. Even-length samples average the
// two middle values.
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
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

    const firstCommitAt = merge ? resolveFirstCommitAt(merge) : null;

    // A component with no recoverable start time contributes NOTHING to the
    // sample — it is skipped, never pushed as a 0. A 0 would drag the mean
    // toward "instant" and quietly claim a cycle time we never measured.
    let cycleTimeSeconds = null;
    if (merge && firstCommitAt) {
      cycleTimeSeconds = Math.round((new Date(merge.mergedAt).getTime() - new Date(firstCommitAt).getTime()) / 1000);
      cycleTimes.push(cycleTimeSeconds);
    }

    const openFailCount = Object.values(component.checks).reduce((sum, c) => sum + c.fail, 0);
    const openWarnCount = Object.values(component.checks).reduce((sum, c) => sum + c.warn, 0);

    componentRows.push({
      name,
      overall: component.overall,
      status: component.status,
      checks: component.checks,
      openCount: openFailCount + openWarnCount,
      openFailCount,
      openWarnCount,
      fixedCount: component.history.length,
      history: component.history,
      lastValidated: component.lastValidated,
      storybookUrl: `${STORYBOOK_BASE_URL}?path=/docs/components-${name.toLowerCase()}--docs`,
      pr: merge?.prNumber ? { number: merge.prNumber, url: `${GITHUB_REPO_URL}/pull/${merge.prNumber}` } : null,
      firstCommitAt: firstCommitAt ?? null,
      mergedAt: merge?.mergedAt ?? null,
      cycleTimeSeconds,
    });
  }

  const averageCycleTimeSeconds = mean(cycleTimes);
  const medianCycleTimeSeconds = median(cycleTimes);
  const cycleTimeSampleSize = cycleTimes.length;
  const cycleTimeMissingCount = componentRows.length - cycleTimeSampleSize;

  if (cycleTimeMissingCount > 0) {
    console.warn(
      `  warn: ${cycleTimeMissingCount} of ${componentRows.length} components have no recoverable cycle time — ` +
        `mean and median are over the remaining ${cycleTimeSampleSize}.`,
    );
  }

  const totalOpenIssues = componentRows.reduce((sum, c) => sum + c.openCount, 0);
  const totalCaughtAndFixed = componentRows.reduce((sum, c) => sum + c.fixedCount, 0);
  const totalDesignTokens = countDesignTokens();

  const data = {
    generatedAt: new Date().toISOString(),
    validationReportGeneratedAt: validationReport.generatedAt,
    status: validationReport.status,
    methodologyNotes: {
      cycleTime:
        'Wall-clock elapsed time, first commit to merge — not working hours, and not an estimate of effort. Per ' +
        "component: from the first commit on the PR branch that introduced the component's .tsx file, to that " +
        "PR's merge time. Read from local git history (a first-parent walk over both merge commits and squash " +
        'commits, with squash-merged branches recovered from their permanent refs/pull/N/head ref), not GitHub ' +
        'API timestamps. Follow-on PRs that later touched an already-shipped component (fixes, doc generation) ' +
        'are not counted a second time. Both figures cover the same sample: components with no recoverable start ' +
        'time are excluded outright, never counted as a zero — see cycleTimeSampleSize for how many of the ' +
        'components are actually in it. Read the two figures together, and read them as a summary of a bimodal ' +
        'sample rather than as a typical PR. The components split cleanly into two clusters — four shipped in ' +
        'well under an hour (PR #2 landed three at once in 36 minutes; Tab took 41), and four sat open overnight ' +
        '(16–19 hours, PR #1 and Badge). With the sample split evenly between them, the median falls in the empty ' +
        'gap between the clusters and lands close to the mean, so it is NOT doing its usual job of resisting the ' +
        'outliers here — no component in the set actually took anywhere near either figure. The per-component ' +
        'cycleTimeSeconds values below are the honest read.',
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
      medianCycleTimeSeconds,
      medianCycleTimeLabel: medianCycleTimeSeconds != null ? formatDuration(medianCycleTimeSeconds) : null,
      cycleTimeSampleSize,
      cycleTimeMissingCount,
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
