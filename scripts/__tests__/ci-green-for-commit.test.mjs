/** The Release publish gate: CI verdict for one exact commit, and the workflow step that calls it. */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { load } from 'js-yaml'
import { afterEach, describe, expect, it } from 'vitest'

import { ciVerdict, readCiRuns } from '../ci-green-for-commit.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SHA = '337f85363d4aaecd544a434039574700dd2bca5e'
const OTHER = 'f'.repeat(40)
const run = (id, created, status, conclusion, sha = SHA) => ({
  id,
  head_sha: sha,
  created_at: created,
  status,
  conclusion,
})
// The observed 2026-10-30 race: the push run passed, then the daily scheduled run
// started on the same commit and was still running when Release read the newest run.
const pushGreen = run(41065086468, '2026-10-30T13:25:02Z', 'completed', 'success')
const schedulePending = run(41065610090, '2026-10-30T13:43:37Z', 'in_progress', null)

describe('ciVerdict', () => {
  it('accepts a passed push run that a newer in-progress scheduled run would have hidden', () => {
    expect(ciVerdict([schedulePending, pushGreen], SHA)).toMatchObject({
      passed: true,
      runId: 41065086468,
    })
  })

  it('refuses when no run for the commit has finished', () => {
    expect(ciVerdict([schedulePending], SHA)).toEqual({
      passed: false,
      reason: `no finished CI run for ${SHA} yet (1 still running)`,
    })
    expect(ciVerdict([], SHA).passed).toBe(false)
  })

  it('ignores runs for another commit', () => {
    const elsewhere = run(1, '2026-10-30T14:00:00Z', 'completed', 'success', OTHER)
    expect(ciVerdict([elsewhere], SHA).passed).toBe(false)
  })

  it('lets a newer conclusive failure block an earlier pass', () => {
    const failed = run(3, '2026-10-30T14:00:00Z', 'completed', 'failure')
    expect(ciVerdict([pushGreen, failed], SHA)).toMatchObject({ passed: false, runId: 3 })
    const timedOut = run(4, '2026-10-30T14:00:00Z', 'completed', 'timed_out')
    expect(ciVerdict([timedOut, pushGreen], SHA).passed).toBe(false)
  })

  it('accepts a passing re-run after a failure', () => {
    const failed = run(2, '2026-10-30T13:00:00Z', 'completed', 'failure')
    expect(ciVerdict([failed, pushGreen], SHA)).toMatchObject({ passed: true, runId: pushGreen.id })
  })

  it('lets every newer finished non-passing run block an earlier pass, unknown ones included', () => {
    for (const conclusion of [
      'action_required',
      'neutral',
      'startup_failure',
      'some_future_value',
    ]) {
      const blocked = run(6, '2026-10-30T14:00:00Z', 'completed', conclusion)
      expect(ciVerdict([pushGreen, blocked], SHA), conclusion).toEqual({
        passed: false,
        reason: `CI run 6 for ${SHA} ended ${conclusion}`,
        runId: 6,
      })
    }
  })

  it('does not let a cancelled, skipped or stale run decide either way', () => {
    for (const conclusion of ['cancelled', 'skipped', 'stale']) {
      const withdrawn = run(5, '2026-10-30T14:00:00Z', 'completed', conclusion)
      expect(ciVerdict([withdrawn, pushGreen], SHA).passed, conclusion).toBe(true)
      expect(ciVerdict([withdrawn], SHA)).toEqual({
        passed: false,
        reason: `no CI run reached a verdict for ${SHA}`,
      })
    }
  })
})

describe('readCiRuns', () => {
  it('reads every page for the exact commit and parses one run per line', async () => {
    let call
    const exec = (cmd, args, options, done) => {
      call = { cmd, args, options }
      done(null, `${JSON.stringify(pushGreen)}\n${JSON.stringify(schedulePending)}\n`)
    }
    await expect(readCiRuns('molecule-dev/molecule', SHA, { exec })).resolves.toEqual([
      pushGreen,
      schedulePending,
    ])
    expect(call.cmd).toBe('gh')
    expect(call.args).toContain('--paginate')
    expect(call.args).toContain(
      `repos/molecule-dev/molecule/actions/workflows/ci.yml/runs?head_sha=${SHA}&per_page=100`,
    )
    expect(call.options.timeout).toBe(60_000)
  })

  it('rejects a transport failure or a timeout instead of reading it as a verdict', async () => {
    const exec = (_cmd, _args, _options, done) => done(new Error('Command timed out'), '')
    await expect(readCiRuns('molecule-dev/molecule', SHA, { exec })).rejects.toThrow(
      /reading CI runs failed: Command timed out/,
    )
  })
})

describe('Release workflow guard step', () => {
  const dirs = []
  afterEach(() => dirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })))

  const guardOf = (yaml) =>
    load(yaml).jobs.release.steps.find(
      (step) => step.name === 'Guard — CI is green for this commit',
    )

  /** Run a guard step's shell with a fake `gh` serving `runs` (newest first). */
  function runGuard(guard, runs, { ghExit = 0 } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-guard-'))
    dirs.push(dir)
    fs.mkdirSync(path.join(dir, 'bin'))
    fs.writeFileSync(path.join(dir, 'runs.json'), JSON.stringify(runs))
    // --paginate --jq '.workflow_runs[]' prints one run per line; the original
    // guard's per_page=1 query printed the newest run's conclusion, or "none".
    fs.writeFileSync(
      path.join(dir, 'bin', 'gh'),
      `#!/usr/bin/env node
const runs = JSON.parse(require('fs').readFileSync(${JSON.stringify(path.join(dir, 'runs.json'))}, 'utf8'))
if (${ghExit}) process.exit(${ghExit})
if (process.argv.includes('--paginate')) for (const r of runs) console.log(JSON.stringify(r))
else console.log(runs[0]?.conclusion ?? 'none')
`,
      { mode: 0o755 },
    )
    return spawnSync('bash', ['-c', guard.run], {
      cwd: ROOT,
      env: {
        ...process.env,
        PATH: `${path.join(dir, 'bin')}:${process.env.PATH}`,
        GITHUB_REPOSITORY: 'molecule-dev/molecule',
        GITHUB_SHA: SHA,
      },
      encoding: 'utf8',
    })
  }

  const current = guardOf(fs.readFileSync(path.join(ROOT, '.github/workflows/release.yml'), 'utf8'))

  it('the original newest-run guard refused the observed green commit', () => {
    // The guard's shell as it stood at 337f85363, which read only the newest run.
    const original = {
      run: `set -eu
conclusion="$(gh api \\
  "repos/\${GITHUB_REPOSITORY}/actions/workflows/ci.yml/runs?head_sha=\${GITHUB_SHA}&per_page=1" \\
  --jq '.workflow_runs[0].conclusion // "none"')"
if [ "$conclusion" != "success" ]; then
  echo "::error::CI has not passed for \${GITHUB_SHA} (status: \${conclusion})." >&2
  exit 1
fi`,
    }
    expect(runGuard(original, [schedulePending, pushGreen]).status).toBe(1)
    expect(runGuard(original, [pushGreen]).status).toBe(0)
  })

  it('publishes past an in-progress scheduled run when the push run passed', () => {
    const result = runGuard(current, [schedulePending, pushGreen])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain(`CI passed for ${SHA}`)
  })

  it('refuses a failed, missing or unreadable CI result', () => {
    const failed = run(9, '2026-10-30T14:00:00Z', 'completed', 'failure')
    expect(runGuard(current, [failed, pushGreen]).status).toBe(1)
    expect(runGuard(current, [schedulePending]).status).toBe(1)
    expect(runGuard(current, []).status).toBe(1)
    const unreadable = runGuard(current, [pushGreen], { ghExit: 4 })
    expect(unreadable.status).toBe(1)
    expect(unreadable.stderr).toContain('reading CI runs failed')
  })
})
