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
  suiteSummary,
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
    expect(sentence).toContain(
      'Ran 4 of 13 files in 280 s and was stopped by its own `timeout 280`',
    )
    expect(sentence).toContain('the 9 it never reached have not run')
    expect(sentence).toContain('run it in the background (run_in_background + wait_for_task)')
    expect(sentence).toContain(
      'The last thing it was doing: Failure hurl/errors_articles.hurl (20 request(s) in 270 ms).',
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
    expect(cutRunSentence(cut!)).toContain(
      'Ran 4 of 11 tests in 90 s and was stopped by its own `timeout 90` — the 7 it never reached have not run',
    )
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

// X1 xr-molecule-flash-m101 (+12:13, 2026-10-17): the executor re-ran the suite in the FOREGROUND,
// got back `1 failed / 1 skipped / 36 passed (2.5m)` with `exitCode: 0` and no state, read it as
// "all previously failing tests pass", and spent the next three minutes on a production build and
// a deploy decision. Every fixture below is the run's own output, copied from the chat payload.
describe('the summary that does not account for its announced total (m101)', () => {
  /** The executor's command, verbatim — the three failing spec files, through `| tail -25`. */
  const M101_COMMAND =
    'cd /workspace/my-app/app && npx tsc --noEmit 2>&1 | head -5; cd /workspace/fixtures/realworld/specs/e2e ' +
    '&& TEST_MODE=fullstack baseURL=http://localhost:5173 npx --prefix /workspace/my-app/app playwright ' +
    'test --config playwright.run.config.ts --reporter=list navigation.spec.ts social.spec.ts comments.spec.ts ' +
    '2>&1 | tail -25'

  /** The runner's announcement, printed before the first test — the half `| tail -25` cut away. */
  const M101_ANNOUNCEMENT = 'Running 139 tests using 1 worker\n'

  /** The stdout the tool returned: only the tally lines survived the executor's own `| tail`. */
  const M101_STDOUT =
    'npm warn config ignoring workspace config at /workspace/my-app/app/.npmrc\n' +
    '\n' +
    '  1 failed\n' +
    '    [chromium] › comments.spec.ts:102:3 › Comments › should require login to post comment ────────\n' +
    '  1 skipped\n' +
    '  36 passed (2.5m)\n'

  it('reads 38 accounted for 139 as stopped, and never hands back the pipeline’s 0', () => {
    const cut = commandCutRun(
      M101_COMMAND,
      { stdout: `${M101_ANNOUNCEMENT}${M101_STDOUT}`, stderr: '', exitCode: 0 },
      153_326,
      290,
    )
    expect(cut).toMatchObject({
      seconds: 153,
      stoppedBy: 'process-stop',
      exitCode: null,
      ran: 38,
      total: 139,
      noun: 'tests',
      doing: '36 passed (2.5m)',
    })
  })

  it('says how many tests the stop left unrun, and sends the next run to the background', () => {
    const cut = commandCutRun(
      M101_COMMAND,
      { stdout: `${M101_ANNOUNCEMENT}${M101_STDOUT}`, stderr: '', exitCode: 0 },
      153_326,
      290,
    )!
    expect(cutRunSentence(cut)).toContain(
      'Ran 38 of 139 tests in 153 s and was stopped by a process kill outside this tool ' +
        '(no `timeout` of its own and no limit of this tool had fired) — the 101 it never reached ' +
        'have not run; run it in the background (run_in_background + wait_for_task)',
    )
  })

  it('does NOT call a summary that accounts for the announced total stopped', () => {
    expect(
      commandCutRun(
        M101_COMMAND,
        {
          stdout:
            'Running 139 tests using 1 worker\n  2 failed\n  1 skipped\n  136 passed (4.0m)\n',
          stderr: '',
          exitCode: 0,
        },
        240_000,
        290,
      ),
    ).toBeNull()
  })

  it('detects the cut on the RAW output when the truncation dropped the announcement', () => {
    const truncated = M101_STDOUT
    // Without the raw text the tally reconciles with nothing, so it reads as a finished run…
    expect(
      commandCutRun(M101_COMMAND, { stdout: truncated, stderr: '', exitCode: 0 }, 153_326, 290),
    ).toBeNull()
    // …and with it, the announcement it announced against is there.
    const cut = commandCutRun(
      M101_COMMAND,
      { stdout: truncated, stderr: '', exitCode: 0 },
      153_326,
      290,
      `${M101_ANNOUNCEMENT}${truncated}`,
    )
    expect(cut).toMatchObject({ ran: 38, total: 139, exitCode: null })
  })

  it('reads Vitest’s own total in parentheses the same way', () => {
    expect(
      commandCutRun(
        'npx vitest run',
        {
          stdout:
            ' Test Files  1 failed | 2 passed (3)\n      Tests  1 failed | 149 passed (151)\n',
          stderr: '',
          exitCode: 0,
        },
        120_000,
        290,
      ),
    ).toMatchObject({
      ran: 150,
      total: 151,
      noun: 'tests',
      exitCode: null,
      stoppedBy: 'process-stop',
    })
    expect(
      commandCutRun(
        'npx vitest run',
        { stdout: '      Tests  151 passed (151)\n', stderr: '', exitCode: 0 },
        120_000,
        290,
      ),
    ).toBeNull()
  })

  it('reads a non-reconciling summary that used the whole budget as this tool’s limit', () => {
    const cut = commandCutRun(
      'npx playwright test 2>&1 | tail -20',
      { stdout: `${M101_ANNOUNCEMENT}${M101_STDOUT}`, stderr: '', exitCode: 124 },
      295_000,
      290,
    )
    expect(cut).toMatchObject({ seconds: 290, stoppedBy: 'tool-budget', exitCode: 124 })
    expect(cutRunSentence(cut!)).toContain("this tool's limit")
  })

  it('reports what the summary accounts for', () => {
    expect(suiteSummary(`${M101_ANNOUNCEMENT}${M101_STDOUT}`)).toMatchObject({
      announced: 139,
      accounted: 38,
      finished: false,
    })
    expect(suiteSummary('Running 2 tests using 1 worker\n  2 passed (1.1s)\n')).toMatchObject({
      announced: 2,
      accounted: 2,
      finished: true,
    })
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
    expect(result.error?.startsWith('Ran 4 files in 280 s and was stopped by')).toBe(true)
    expect(result.stdout).toContain('Success hurl/articles.hurl')
    now.mockRestore()
  })

  it('detects the cut on the RAW output after the size cap dropped the announcement', async () => {
    const backend = mockBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    let clock = 1_000_000
    const now = vi.spyOn(Date, 'now').mockImplementation(() => clock)
    // A long run: the announcement sits behind the install warnings, and `truncateMiddle` keeps
    // only 800 characters of head once a failure block is present — so the announcement survives
    // only in the raw output.
    const raw =
      `${'npm warn deprecated fsevents@1.2.13: please update\n'.repeat(80)}` +
      'Running 139 tests using 1 worker\n' +
      '  ✓  1 [chromium] › articles.spec.ts:32:3 › Articles › should create a new article (2.6s)\n'.repeat(
        2000,
      ) +
      '  1) [chromium] › comments.spec.ts:102:3 › Comments › should require login to post comment ────\n' +
      '    Error: expect(locator).toBeVisible() failed\n  1 failed\n  1 skipped\n  36 passed (2.5m)\n'
    expect(raw.length).toBeGreaterThan(100 * 1024)
    backend.run = vi.fn(async () => {
      clock += 153_326
      return { stdout: raw, stderr: '', exitCode: 0 }
    })

    const result = (await exec.execute({
      // No pipe: a Playwright run behind one is backgrounded by this tool, and this is the
      // foreground path whose returned stdout the size cap shortens.
      command:
        'TEST_MODE=fullstack npx --prefix /workspace/my-app/app playwright test --config ' +
        'playwright.run.config.ts --reporter=line',
    })) as {
      status?: string
      exitCode?: number | null
      cutRun?: { ran?: number | null; total?: number | null }
      stdout?: string
    }
    now.mockRestore()
    expect(result.status).toBe(CUT_AT_BUDGET)
    expect(result.exitCode).toBeNull()
    expect(result.cutRun).toMatchObject({ ran: 38, total: 139 })
    // The returned stdout is still the capped copy — which is exactly why detection cannot read it.
    expect(result.stdout).not.toContain('Running 139 tests')
  })

  it('reports a run stopped inside the grace as stopped, not as a finished 0', async () => {
    // A Playwright run behind a pipe is started detached and handed back after the grace when it
    // ends inside it — the same foreground shape, and the same lie if a partial tally is read as a
    // finish (X1 xr-molecule-flash-m101 +12:13).
    const backend = mockBackend()
    const tools = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 5_000 })
    const exec = tools.find((t) => t.name === 'exec_command')!
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    backend.run = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    backend.readFile = vi.fn(async (p: string) =>
      p.endsWith('.exit')
        ? '0'
        : 'Running 139 tests using 1 worker\n  1 failed\n  1 skipped\n  36 passed (2.5m)\n',
    ) as unknown as ExecutionBackend['readFile']

    const result = (await exec.execute({
      command: 'npx playwright test --reporter=list 2>&1 | tail -20',
    })) as {
      status?: string
      exitCode?: number | null
      cutRun?: { ran?: number | null; total?: number | null }
      error?: string
    }
    now.mockRestore()
    expect(result.status).toBe(CUT_AT_BUDGET)
    expect(result.exitCode).toBeNull()
    expect(result.cutRun).toMatchObject({ ran: 38, total: 139 })
    expect(result.error?.startsWith('Ran 38 of 139 tests')).toBe(true)
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
    expect(result.note).toContain('Ran 4 files in 280 s and was stopped by')
  })
})
