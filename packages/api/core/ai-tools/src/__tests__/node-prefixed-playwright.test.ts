/**
 * The Playwright runner reached by FILE instead of by its `.bin` NAME.
 *
 * xr-molecule-flash-m179 (+17:51) ran
 * `node /workspace/node_modules/.bin/playwright test --config /workspace/.mol-scratch/pw.config.ts`
 * after `npx playwright test` in every earlier call. No reader recognised the spelling: the run
 * got no `--trace` (its failures left no network log), no suite-budget pin, no proof credit and no
 * overlap hold, and the platform then rejected a green deployed walk and spent ~10.5 minutes
 * re-running it. The finding's fix is ONE normaliser in `command-position.ts` — the shell parse
 * every classifier shares — so all launcher forms read as the same run.
 *
 * Each form below is checked through the same consumers the launch path uses: recognition
 * (`isPlaywrightRunCommand`, `isSuiteRunCommand`), the background launcher's reporter rewrite
 * (`streamingBackgroundCommand`), the trace rewrite (`diagnosisTraceCommand`) and the budget pin
 * (`suiteRunBudgetCommand`).
 */

import { describe, expect, it } from 'vitest'

import { commandSegments } from '../command-position.js'
import { commandRunsNoTests } from '../no-test-run.js'
import { scopedRerunCommand, withSuiteConfig } from '../suite-overlap.js'
import { DIAGNOSIS_TRACE_FLAG, diagnosisTraceCommand } from '../trace-artifacts.js'
import {
  isPlaywrightRunCommand,
  isSuiteRunCommand,
  streamingBackgroundCommand,
  suiteRunBudgetCommand,
} from '../utilities.js'

/** The finding's own run: `cd` and env prefixes, the absolute `.bin` shim behind `node`. */
const M179 =
  'cd /workspace && TEST_MODE=fullstack node /workspace/node_modules/.bin/playwright test ' +
  '--config /workspace/.mol-scratch/pw.config.ts'

/**
 * Every spelling of the same run: what the launcher is, and the command that starts it.
 *
 * `node <path>/playwright test`, `node <path>/@playwright/test/cli.js test`, `npx playwright
 * test`, `pnpm exec playwright test`, `yarn playwright test` and the `<path>/.bin/playwright
 * test` form itself — with the env assignments and `cd` prefixes the executor writes.
 */
const LAUNCHERS: ReadonlyArray<[string, string]> = [
  ['the finding’s own command', M179],
  [
    'node with the playwright package’s cli.js',
    'node /workspace/node_modules/playwright/cli.js test --config /workspace/.mol-scratch/pw.config.ts',
  ],
  [
    'node with @playwright/test’s cli.js',
    'node /workspace/node_modules/@playwright/test/cli.js test --config /workspace/.mol-scratch/pw.config.ts',
  ],
  [
    'node through its own options and `--`',
    'node --max-old-space-size=4096 -- /workspace/node_modules/.bin/playwright test ' +
      '--config /workspace/.mol-scratch/pw.config.ts',
  ],
  ['npx playwright test', 'npx playwright test --config /workspace/.mol-scratch/pw.config.ts'],
  [
    'pnpm exec playwright test',
    'pnpm exec playwright test --config /workspace/.mol-scratch/pw.config.ts',
  ],
  ['yarn playwright test', 'yarn playwright test --config /workspace/.mol-scratch/pw.config.ts'],
  [
    'the .bin path itself',
    '/workspace/node_modules/.bin/playwright test --config /workspace/.mol-scratch/pw.config.ts',
  ],
]

describe('the Playwright runner, however its launcher is spelled', () => {
  it.each(LAUNCHERS)('is recognised as one run: %s', (_name, command) => {
    const segment = commandSegments(command).at(-1)
    expect(segment?.program).toBe('playwright')
    // The runner's own argument list survives the launcher: `test` is still first, so every
    // `^playwright\s+test` reader downstream sees the same invocation.
    expect(segment?.args[0]).toBe('test')
    expect(segment?.text.startsWith('playwright test')).toBe(true)
    expect(isPlaywrightRunCommand(command)).toBe(true)
    expect(isSuiteRunCommand(command)).toBe(true)
    // The background launcher rewrites the run the same way it rewrites `npx playwright test`.
    const streamed = streamingBackgroundCommand(command)
    expect(streamed.error).toBeUndefined()
    expect(streamed.changes.length).toBeGreaterThan(0)
    // The run itself is untouched apart from flags written on its own arguments.
    expect(streamed.command).toContain(command)
    expect(streamed.command).toMatch(/--reporter=list --retries=0$/)
  })

  it.each(LAUNCHERS)(
    'gets the trace flag on the run’s own arguments: %s',
    async (_name, command) => {
      const out = await diagnosisTraceCommand({
        command,
        cwd: '/workspace',
        readFile: async () => '',
      })
      // Nothing in the config records a trace, so the platform adds it — at the end of the
      // runner's statement, never after a pipe or a redirect.
      expect(out.change).toContain(DIAGNOSIS_TRACE_FLAG)
      expect(out.command).toBe(`${command} ${DIAGNOSIS_TRACE_FLAG}`)
    },
  )

  it.each(LAUNCHERS)('gets the suite-budget pin on the run: %s', (_name, command) => {
    const out = suiteRunBudgetCommand(command, ['--timeout=15000', '--workers=1'])
    expect(out.unplaced).toEqual([])
    expect(out.placed).toEqual(['--timeout=15000', '--workers=1'])
    expect(out.command).toBe(`${command} --timeout=15000 --workers=1`)
  })

  it('puts the pin and the trace inside the run, before a pipe or a redirect', async () => {
    const command =
      'cd /workspace && node /workspace/node_modules/.bin/playwright test ' +
      '--config pw.config.ts 2>&1 | tail -5'
    const pinned = suiteRunBudgetCommand(command, ['--timeout=15000']).command
    expect(pinned).toBe(
      'cd /workspace && node /workspace/node_modules/.bin/playwright test ' +
        '--config pw.config.ts --timeout=15000 2>&1 | tail -5',
    )
    const traced = await diagnosisTraceCommand({
      command,
      cwd: '/workspace',
      readFile: async () => '',
    })
    expect(traced.command).toBe(
      'cd /workspace && node /workspace/node_modules/.bin/playwright test ' +
        `--config pw.config.ts ${DIAGNOSIS_TRACE_FLAG} 2>&1 | tail -5`,
    )
  })

  it('composes a narrowed re-run and carries the config onto the same launcher', () => {
    for (const command of LAUNCHERS.map(([, value]) => value)) {
      const rerun = scopedRerunCommand(command, ['e2e/articles.spec.ts:12'])
      expect(rerun, command).toContain(' e2e/articles.spec.ts:12 --retries=0')
      expect(rerun, command).toContain(command.slice(0, command.indexOf('playwright')))
    }
    expect(
      withSuiteConfig(
        'node /workspace/node_modules/@playwright/test/cli.js test --workers=4',
        'pw.config.ts',
      ),
    ).toBe(
      "node /workspace/node_modules/@playwright/test/cli.js test --config 'pw.config.ts' --workers=4",
    )
  })

  it('reads a node-wrapped --list as the collector it is, not a run', () => {
    const list = 'node /workspace/node_modules/.bin/playwright test --list'
    expect(isPlaywrightRunCommand(list)).toBe(false)
    expect(isSuiteRunCommand(list)).toBe(false)
    expect(streamingBackgroundCommand(list).changes).toEqual([])
  })
})

describe('a node invocation that is not the runner', () => {
  /** Ordinary node scripts: the parse keeps `node` as the program and no reader fires. */
  const OTHER_SCRIPTS: readonly string[] = [
    'node scripts/probe.mjs',
    'cd /workspace && node e2e/seed.mjs --reset',
    `node -e "console.log('playwright test')"`,
    'node --test',
    'node /workspace/node_modules/.bin/vite --version',
  ]

  it.each(OTHER_SCRIPTS)('runs its own script, not a suite: %s', (command) => {
    expect(commandSegments(command).at(-1)?.program).toBe('node')
  })

  /**
   * The Playwright CLI in a sub-command that starts no test, and every other shape: nothing may
   * be rewritten. The first two read as a `playwright` invocation (`--version`, `install`) and
   * still run no suite, which is the same answer `npx playwright install` gets.
   */
  const NOT_A_RUN: readonly string[] = [
    ...OTHER_SCRIPTS,
    'node /workspace/node_modules/.bin/playwright install',
    'node /workspace/node_modules/playwright/cli.js --version',
    'node /workspace/node_modules/.bin/playwright test --list',
  ]

  it.each(NOT_A_RUN)('is left exactly as written: %s', (command) => {
    expect(isPlaywrightRunCommand(command)).toBe(false)
    expect(isSuiteRunCommand(command)).toBe(false)
    // Nothing about the run is rewritten. The one thing a background command always gets is the
    // inline-failure switch at its head — inert for a command that runs no Playwright `list`
    // reporter, and how a wrapper the reader cannot place is covered (m191).
    const inline = 'export PLAYWRIGHT_LIST_PRINT_FAILURES_INLINE=1; '
    expect(streamingBackgroundCommand(command)).toEqual({
      // The no-test invocations (`playwright install`, `--version`, `test --list`) keep no head.
      command: commandRunsNoTests(command) ? command : `${inline}${command}`,
      changes: [],
    })
    expect(suiteRunBudgetCommand(command, ['--timeout=15000'])).toEqual({
      command,
      placed: [],
      unplaced: ['--timeout=15000'],
    })
  })
})
