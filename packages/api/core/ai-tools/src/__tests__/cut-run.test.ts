/**
 * A run a budget stopped (X1 xr-molecule-flash-m93, +12:37 and +06:22, 2026-10-16).
 *
 * The run below is the one m93 re-sent three times: `timeout 280 hurl … | tail -60`, 284 s, four
 * of thirteen files finished, `exitCode: 0` — the `| tail`'s status, which the executor read as a
 * suite that nearly passed. Every fixture in this file is copied from that run's own result.
 */

import { describe, expect, it, vi } from 'vitest'

import {
  commandCutRun,
  commandRunState,
  commandTimeoutSeconds,
  CUT_AT_BUDGET,
  cutRunSentence,
  suiteTally,
} from '../index.js'
import { buildTools } from '../tools.js'
import type { ExecutionBackend } from '../types.js'

/** m93's third suite run, verbatim: the command the executor sent. */
const M93_COMMAND =
  'cd /workspace/fixtures/realworld/specs/api && timeout 280 hurl --test --continue-on-error ' +
  '--jobs 1 --variable host=http://localhost:4000 --variable uid=t5 hurl/*.hurl 2>&1 | tail -60'

/** …and the stdout it produced, verbatim: four files, then 283 s of silence. */
const M93_STDOUT =
  'Success hurl/articles.hurl (17 request(s) in 318 ms)\n' +
  'Success hurl/auth.hurl (20 request(s) in 521 ms)\n' +
  'Success hurl/comments.hurl (13 request(s) in 270 ms)\n' +
  'error: Assert failure  --> hurl/errors_articles.hurl:149\n' +
  'Failure hurl/errors_articles.hurl (20 request(s) in 270 ms)\n'

/** m93's second suite run: the tool's own budget stopped it at 290 s with nothing to read. */
const M93_BUDGET_COMMAND =
  'cd /workspace/fixtures/realworld/specs/api && HOST=http://localhost:4000 ' +
  './run-api-tests-hurl.sh 2>&1 | tail -45'

/** The healthy run 41 s earlier, in full: the same suite, its own closing tally. */
const HEALTHY_STDOUT =
  'Failure hurl/feed.hurl (1 request(s) in 1 ms)\n' +
  '--------------------------------------------------------------------------------\n' +
  'Executed files:    13\n' +
  'Executed requests: 28 (400.0/s)\n' +
  'Succeeded files:   0 (0.0%)\n' +
  'Failed files:      13 (100.0%)\n' +
  'Duration:          70 ms (0h:0m:0s:70ms)\n'

describe('commandCutRun — the run m93 re-sent three times', () => {
  it('reads `timeout 280 … | tail -60` as stopped at 280 s, not as exit 0', () => {
    const cut = commandCutRun(
      M93_COMMAND,
      { stdout: M93_STDOUT, stderr: '', exitCode: 0 },
      284_000,
      290,
    )
    expect(cut).not.toBeNull()
    expect(cut).toMatchObject({
      seconds: 280,
      stoppedBy: 'command-timeout',
      // The 0 belongs to `tail`; the run never reported a code of its own.
      exitCode: null,
      ran: 4,
      noun: 'files',
      doing: 'Failure hurl/errors_articles.hurl (20 request(s) in 270 ms)',
    })
  })

  it('says so in the words the finding asks for', () => {
    const cut = commandCutRun(
      M93_COMMAND,
      { stdout: M93_STDOUT, stderr: '', exitCode: 0 },
      284_000,
      290,
    )!
    const sentence = cutRunSentence({ ...cut, total: 13 })
    expect(sentence).toContain('This run was stopped after 280s')
    expect(sentence).toContain('4 of 13 files ran, the rest did not run')
    expect(sentence).toContain(
      'the last thing it was doing: Failure hurl/errors_articles.hurl (20 request(s) in 270 ms)',
    )
    expect(sentence).toContain('no exit code of its own to report')
  })

  it('reads the tool-budget stop (exit 124, nothing printed) as stopped, and keeps the 124', () => {
    const cut = commandCutRun(
      M93_BUDGET_COMMAND,
      { stdout: '', stderr: '', exitCode: 124 },
      294_000,
      290,
    )
    expect(cut).toMatchObject({ seconds: 290, stoppedBy: 'tool-budget', exitCode: 124, ran: null })
    expect(cutRunSentence(cut!)).toContain("this tool's limit")
  })

  it('does NOT call the healthy 13-file run stopped', () => {
    expect(
      commandCutRun(
        M93_BUDGET_COMMAND,
        { stdout: HEALTHY_STDOUT, stderr: '', exitCode: 0 },
        474,
        290,
      ),
    ).toBeNull()
  })

  it('does not call a suite that finished inside its own bound stopped', () => {
    expect(
      commandCutRun(
        M93_COMMAND,
        { stdout: `${M93_STDOUT}Executed files: 13\n`, stderr: '', exitCode: 0 },
        9_500,
        290,
      ),
    ).toBeNull()
  })

  it('reads a cut build with no counts, naming no files it did not count', () => {
    const cut = commandCutRun(
      'timeout 60 npm run build 2>&1 | tail -20',
      { stdout: 'vite v7 building…\n', stderr: '', exitCode: 0 },
      61_000,
      290,
    )
    expect(cut).toMatchObject({ seconds: 60, exitCode: null, ran: null, total: null })
    expect(cutRunSentence(cut!)).toContain('before it finished')
  })

  it('leaves a command with no bound and no budget alone', () => {
    expect(
      commandCutRun('hurl --test hurl/*.hurl', { stdout: '', stderr: '', exitCode: 0 }, 300, 0),
    ).toBeNull()
  })

  it('leaves a short bound alone when the run finished inside it', () => {
    expect(
      commandCutRun(
        'timeout 5 npm test 2>&1 | tail -20',
        { stdout: 'ok\n', stderr: '', exitCode: 0 },
        3_000,
        290,
      ),
    ).toBeNull()
  })

  it('reads a background run with no tool budget by the bound the command carried', () => {
    // The drain path: the command was backgrounded, so no tool budget applied to it at all —
    // its own `timeout` is the only bound, and the exit file handed back the pipeline's 0.
    const cut = commandCutRun(
      'timeout 280 hurl --test hurl/*.hurl 2>&1 | tail -60',
      { stdout: M93_STDOUT, stderr: '', exitCode: 0 },
      288_000,
      0,
    )
    expect(cut).toMatchObject({
      seconds: 280,
      stoppedBy: 'command-timeout',
      exitCode: null,
      ran: 4,
    })
  })

  it('reads a Playwright run stopped mid-suite from its own `[n/K]` progress', () => {
    const cut = commandCutRun(
      'timeout 90 npx playwright test | tail -20',
      {
        stdout:
          '[3/11] specs/auth.spec.ts:10:5 › signs a user up\n[4/11] specs/feed.spec.ts:8:3 › shows the feed\n',
        stderr: '',
        exitCode: 0,
      },
      91_000,
      290,
    )
    expect(cut).toMatchObject({ seconds: 90, ran: 4, total: 11, noun: 'tests', exitCode: null })
    expect(cutRunSentence(cut!)).toContain('4 of 11 tests ran, the rest did not run')
  })
})

describe('commandRunState — the one reader every verdict goes through', () => {
  it('reads the state off a stopped run', () => {
    expect(commandRunState({ status: CUT_AT_BUDGET, exitCode: null })).toBe(CUT_AT_BUDGET)
  })

  it('reads a run that ended as ran, with no state, an exit code or neither', () => {
    expect(commandRunState({ stdout: '1 passed', exitCode: 0 })).toBe('ran')
    expect(commandRunState({ taskId: 'mol-bg-1-2', status: 'stuck' })).toBe('ran')
    expect(commandRunState(null)).toBe('ran')
  })
})

describe('commandTimeoutSeconds — the bound a command puts on itself', () => {
  it('reads the bound past the kill-grace flag', () => {
    expect(commandTimeoutSeconds('timeout -k 5 280 hurl --test a.hurl')).toBe(280)
    expect(commandTimeoutSeconds('cd /x && timeout 1.5m npx playwright test')).toBe(90)
  })

  it('reads a `timeout` named as an argument as no bound at all', () => {
    expect(commandTimeoutSeconds("grep -n 'timeout 280' notes.md")).toBeNull()
    expect(commandTimeoutSeconds('echo hi')).toBeNull()
  })

  it('takes the largest bound in the command', () => {
    expect(commandTimeoutSeconds('timeout 30 a && timeout 90 b')).toBe(90)
  })
})

describe('suiteTally — what separates finished from stopped', () => {
  it('sees Hurl’s summary and Playwright’s total', () => {
    expect(suiteTally(HEALTHY_STDOUT)).toBe(true)
    expect(suiteTally('74 passed (4.2m)\n')).toBe(true)
    expect(suiteTally(M93_STDOUT)).toBe(false)
  })
})

describe('exec_command reports the stopped run', () => {
  function mockBackend(): ExecutionBackend {
    return {
      projectRoot: '/test',
      readFile: vi.fn().mockResolvedValue('file content'),
      writeFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      readDir: vi.fn().mockResolvedValue([]),
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    }
  }

  it('answers m93’s cut run with the state, exitCode null, and the counts first', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    let clock = 1_000_000
    const now = vi.spyOn(Date, 'now').mockImplementation(() => clock)
    backend.run = vi.fn(async () => {
      clock += 284_000
      return { stdout: M93_STDOUT, stderr: '', exitCode: 0 }
    })

    const result = (await exec.execute({ command: M93_COMMAND })) as {
      status?: string
      exitCode?: number | null
      error?: string
      stdout?: string
    }
    // The whole point: a stopped run is never handed back as exit 0.
    expect(result.status).toBe(CUT_AT_BUDGET)
    expect(result.exitCode).toBeNull()
    expect(commandRunState(result)).toBe(CUT_AT_BUDGET)
    expect(result.error?.startsWith('This run was stopped after 280s')).toBe(true)
    expect(result.stdout).toContain('Success hurl/articles.hurl')
    now.mockRestore()
  })

  it('answers the tool-budget stop with the state and 124', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    let clock = 1_000_000
    const now = vi.spyOn(Date, 'now').mockImplementation(() => clock)
    backend.run = vi.fn(async () => {
      clock += 294_000
      return { stdout: '', stderr: '', exitCode: 124 }
    })

    const result = (await exec.execute({ command: M93_BUDGET_COMMAND })) as {
      status?: string
      exitCode?: number | null
      error?: string
    }
    expect(result.status).toBe(CUT_AT_BUDGET)
    expect(result.exitCode).toBe(124)
    expect(result.error).toContain('This run was stopped after 290s')
    expect(result.error).toContain('everything it printed until then')
    now.mockRestore()
  })

  it('leaves a run that ended alone — no state, its own exit code', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    backend.run = vi.fn(async () => ({ stdout: HEALTHY_STDOUT, stderr: '', exitCode: 0 }))
    const result = (await exec.execute({ command: M93_BUDGET_COMMAND })) as {
      status?: string
      exitCode?: number
    }
    expect(result.status).toBeUndefined()
    expect(result.exitCode).toBe(0)
    expect(commandRunState(result)).toBe('ran')
  })

  it('answers the same for a backgrounded run read back with wait_for_task', async () => {
    const backend = mockBackend()
    backend.readFile = vi.fn(async (p: string) =>
      p.endsWith('.exit') ? '0' : M93_STDOUT,
    ) as unknown as ExecutionBackend['readFile']
    const tools = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    const wait = tools.find((t) => t.name === 'wait_for_task')!
    let clock = 1_000_000
    const now = vi.spyOn(Date, 'now').mockImplementation(() => clock)
    const started = (await exec.execute({
      command: M93_COMMAND,
      run_in_background: true,
    })) as { taskId?: string }
    expect(started.taskId).toBeDefined()
    clock += 284_000
    const result = (await wait.execute({ taskId: started.taskId })) as {
      status?: string
      exitCode?: number | null
      note?: string
    }
    now.mockRestore()
    expect(result.status).toBe(CUT_AT_BUDGET)
    expect(result.exitCode).toBeNull()
    expect(result.note).toContain('This run was stopped after 280s')
  })
})
