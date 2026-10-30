#!/usr/bin/env node
/* global console */
/**
 * Whether CI has passed for one exact commit — the Release workflow's publish gate.
 *
 * Several `ci.yml` runs can exist for one commit: the push run, the daily
 * scheduled run, a manual re-run. Reading only the NEWEST run let a scheduled run
 * that was still in progress hide a push run that had already passed, and the
 * release refused a green commit. The verdict is the newest CONCLUSIVE run for
 * the commit instead: `success` passes; `failure`, `timed_out` and
 * `startup_failure` refuse; runs still in progress and runs that reached no
 * verdict (`cancelled`, `skipped`, `neutral`, `stale`) are ignored. So a re-run
 * that passes after a failure is accepted, a later conclusive failure blocks an
 * earlier pass, and a commit with no conclusive run refuses.
 *
 * Usage (from the workflow, with GH_TOKEN set):
 *   node scripts/ci-green-for-commit.mjs <owner/repo> <sha>
 * Exits 0 when CI passed for that commit, 1 when it did not, 2 when the runs
 * could not be read.
 *
 * @module
 */
import { execFile } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

/** Conclusions that are a verdict on the commit. */
const CONCLUSIVE = new Set(['success', 'failure', 'timed_out', 'startup_failure'])

/**
 * The CI verdict for one commit from its `ci.yml` workflow runs.
 *
 * @param runs - Workflow runs as the GitHub API returns them.
 * @param sha - The exact commit being published.
 * @returns The verdict and why.
 */
export function ciVerdict(runs, sha) {
  const decisive = runs
    .filter(
      (run) => run.head_sha === sha && run.status === 'completed' && CONCLUSIVE.has(run.conclusion),
    )
    .sort((a, b) => Date.parse(b.created_at ?? '') - Date.parse(a.created_at ?? ''))[0]
  if (!decisive) {
    const pending = runs.filter((run) => run.head_sha === sha && run.status !== 'completed').length
    return {
      passed: false,
      reason: pending
        ? `no finished CI run for ${sha} yet (${pending} still running)`
        : `no CI run reached a verdict for ${sha}`,
    }
  }
  return decisive.conclusion === 'success'
    ? { passed: true, reason: `CI run ${decisive.id} passed for ${sha}`, runId: decisive.id }
    : {
        passed: false,
        reason: `CI run ${decisive.id} for ${sha} ended ${decisive.conclusion}`,
        runId: decisive.id,
      }
}

/**
 * Every `ci.yml` run for one commit, read through the GitHub CLI.
 *
 * @param repo - `owner/repo`.
 * @param sha - The commit.
 * @param [options] - Injected exec and its timeout.
 * @returns The workflow runs.
 */
export function readCiRuns(repo, sha, { exec = execFile, timeoutMs = 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    exec(
      'gh',
      [
        'api',
        '--paginate',
        `repos/${repo}/actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=100`,
        '--jq',
        '.workflow_runs[]',
      ],
      { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout) => {
        if (error)
          return reject(new Error(`reading CI runs failed: ${error.message}`, { cause: error }))
        try {
          resolve(
            String(stdout)
              .split('\n')
              .filter((line) => line.trim())
              .map((line) => JSON.parse(line)),
          )
        } catch (parseError) {
          reject(new Error('CI runs were not JSON', { cause: parseError }))
        }
      },
    )
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [repo, sha] = process.argv.slice(2)
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? '') || !/^[0-9a-f]{40}$/.test(sha ?? '')) {
    console.error('usage: ci-green-for-commit.mjs <owner/repo> <40-hex sha>')
    process.exit(2)
  }
  try {
    const verdict = ciVerdict(await readCiRuns(repo, sha), sha)
    ;(verdict.passed ? console.log : console.error)(verdict.reason)
    process.exit(verdict.passed ? 0 : 1)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(2)
  }
}
