#!/usr/bin/env node
/* global console */
/**
 * Whether CI has passed for one exact commit — the Release workflow's publish gate.
 *
 * Several `ci.yml` runs can exist for one commit: the push run, the daily
 * scheduled run, a manual re-run. Reading only the NEWEST run let a scheduled run
 * that was still in progress hide a push run that had already passed, and the
 * release refused a green commit. The verdict is the newest CONCLUSIVE attempt for
 * the commit instead: `success` passes; attempts still in progress and attempts
 * withdrawn before a verdict (`cancelled`, `skipped`, `stale`) are ignored; every
 * other finished attempt refuses — `failure`, `timed_out`, `startup_failure`,
 * `action_required`, `neutral` and any conclusion GitHub adds later. So a re-run
 * that passes after a failure is accepted, a later non-passing attempt blocks an
 * earlier pass, and a commit with no conclusive attempt refuses.
 *
 * A re-run keeps its run id and `created_at` and only bumps `run_attempt` and
 * `run_started_at`, so attempts are ordered by `run_started_at`. The run list
 * shows only each run's latest attempt; when that attempt is still running or was
 * withdrawn, the earlier attempts are read too, so cancelling (or still running) a
 * retry of a failed run never hides that failure.
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

/** Conclusions of a run withdrawn before it judged the commit; every other one is a verdict. */
const WITHDRAWN = new Set(['cancelled', 'skipped', 'stale'])

/**
 * The CI verdict for one commit from its `ci.yml` workflow runs.
 *
 * @param runs - Workflow runs as the GitHub API returns them.
 * @param sha - The exact commit being published.
 * @returns The verdict and why.
 */
export function ciVerdict(runs, sha) {
  const decisive = runs
    .filter((run) => run.head_sha === sha && conclusive(run))
    .sort((a, b) => startedAt(b) - startedAt(a))[0]
  if (!decisive) {
    const pending = runs.filter((run) => run.head_sha === sha && run.status !== 'completed').length
    return {
      passed: false,
      reason: pending
        ? `no finished CI run for ${sha} yet (${pending} still running)`
        : `no CI run reached a verdict for ${sha}`,
    }
  }
  const which =
    decisive.run_attempt > 1 ? `${decisive.id} attempt ${decisive.run_attempt}` : decisive.id
  return decisive.conclusion === 'success'
    ? { passed: true, reason: `CI run ${which} passed for ${sha}`, runId: decisive.id }
    : {
        passed: false,
        reason: `CI run ${which} for ${sha} ended ${decisive.conclusion}`,
        runId: decisive.id,
      }
}

/** Whether a run attempt finished with a verdict on the commit. */
const conclusive = (run) => run.status === 'completed' && !WITHDRAWN.has(run.conclusion)

/** When an attempt started; a re-run keeps its original `created_at`. */
const startedAt = (run) => Date.parse(run.run_started_at ?? run.created_at ?? '') || 0

/**
 * Every `ci.yml` run attempt for one commit that can carry its verdict, read through
 * the GitHub CLI: each run's latest attempt, plus — for a run whose latest attempt is
 * still running or was withdrawn — its earlier attempts back to the newest conclusive one.
 *
 * @param repo - `owner/repo`.
 * @param sha - The commit.
 * @param [options] - Injected exec and its timeout.
 * @returns The run attempts.
 */
export async function readCiRuns(repo, sha, options = {}) {
  const runs = await ghLines(
    [
      `repos/${repo}/actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=100`,
      '.workflow_runs[]',
    ],
    options,
  )
  const earlier = []
  for (const run of runs) {
    if (conclusive(run)) continue
    for (let attempt = (run.run_attempt ?? 1) - 1; attempt >= 1; attempt--) {
      const [previous] = await ghLines(
        [`repos/${repo}/actions/runs/${run.id}/attempts/${attempt}`, '.'],
        options,
      )
      if (!previous)
        throw new Error(`reading CI runs failed: run ${run.id} attempt ${attempt} is missing`)
      earlier.push(previous)
      if (conclusive(previous)) break
    }
  }
  return [...runs, ...earlier]
}

/**
 * One `gh api` read, as one JSON value per output line.
 *
 * @param endpointAndJq - The endpoint and the `--jq` filter.
 * @param [options] - Injected exec and its timeout.
 * @returns The parsed lines.
 */
function ghLines([endpoint, jq], { exec = execFile, timeoutMs = 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    exec(
      'gh',
      ['api', '--paginate', endpoint, '--jq', jq],
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
