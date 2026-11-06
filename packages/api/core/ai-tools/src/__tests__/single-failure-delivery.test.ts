import { describe, expect, it, vi } from 'vitest'

import { buildTools } from '../tools.js'
import type { ExecutionBackend } from '../types.js'
import {
  failureCausesNote,
  MAX_OUTPUT_SIZE,
  TOOL_RESULT_CHARS,
  truncateMiddle,
} from '../utilities.js'

const ERROR = 'Error: expect(locator).toHaveText(expected) failed'
const WHERE = 'invoices.spec.ts:42'
const TITLE = 'Invoices › shows the paid balance'
const BLOCK = [
  `  1) [chromium] › ${WHERE}:3 › ${TITLE} ─────`,
  '',
  `    ${ERROR}`,
  '    Expected string: "Paid"',
  '    Received string: "Pending"',
  '',
].join('\n')
const TALLY = `  1 failed\n    [chromium] › ${WHERE}:3 › ${TITLE}\n  137 passed (2.1m)`

/** A list reporter can print its only error in the middle, long before the closing tally. */
function runLog(padding = 7000, block = BLOCK, tally = TALLY): string {
  return `Running 138 tests using 1 worker\n${'progress\n'.repeat(padding / 9)}${block}\n${'progress\n'.repeat(padding / 9)}${tally}`
}

/** The host's second cut (40% head, 60% tail), applied after ai-tools' 100 KB cut. */
function displayed(stdout: string): string {
  return stdout.length <= TOOL_RESULT_CHARS
    ? stdout
    : stdout.slice(0, TOOL_RESULT_CHARS * 0.4) + stdout.slice(-TOOL_RESULT_CHARS * 0.6)
}

function backendFor(log: string, exitCode = 1): ExecutionBackend {
  return {
    projectRoot: '/test',
    readFile: vi.fn(async (path: string) => (path.endsWith('.exit') ? `${exitCode}\n` : log)),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    readDir: vi.fn(),
    run: vi.fn(async () => ({ stdout: log, stderr: '', exitCode })),
  }
}

describe('single-failure delivery', () => {
  it('uses a retried assertion error rather than the retry separator as its cause', () => {
    const block = BLOCK.replace('\n\n    Error:', '\n\n    Retry #1 ─────────\n\n    Error:')
    const note = failureCausesNote(runLog(7000, block))!
    expect(note).toContain(ERROR)
    expect(note).not.toContain('`Retry #1')
  })

  it('does not claim an error was cut when the error survives at the end', () => {
    const log = `${'progress\n'.repeat(1200)}${BLOCK}\n${TALLY}`
    expect(displayed(log)).toContain(ERROR)
    const note = failureCausesNote(log)!
    expect(note).toContain(ERROR)
    expect(note).not.toContain('cut in the middle')
    expect(note).not.toContain('where its error was printed')
  })

  it.each(['characters', 'bytes'])(
    'labels a clipped %s tail without claiming a middle cut',
    (unit) => {
      const note = failureCausesNote(`…(20000 earlier ${unit} omitted)\n${runLog()}`)!
      expect(note).toContain('1 failure in the LAST part')
      expect(note).toContain(`first 20000 ${unit} were clipped`)
      expect(note).not.toContain('cut in the middle')
    },
  )

  it('retains the narrowed re-run and error inside the tool-result budget', () => {
    const note = failureCausesNote(runLog(), [], {
      command:
        'BASE_URL=https://billing.example.test npx playwright test --config billing.config.ts',
      cwd: '/test/app',
    })!
    expect(note).toContain(ERROR)
    expect(note).toContain('Received string: "Pending"')
    expect(note).toContain('Re-run just these once they are fixed:')
    expect(note).toContain(WHERE)
    expect(note).toContain('billing.config.ts')
    expect(note).toContain('BASE_URL=https://billing.example.test')
    expect(note.length).toBeLessThanOrEqual(TOOL_RESULT_CHARS)
  })

  it('never asks to fix an excluded single failure', () => {
    expect(failureCausesNote(runLog(), ['shows the paid balance'])).toBeNull()
  })

  it('never asks to fix a single failure the runner declared flaky', () => {
    const tally = `  1 flaky\n    [chromium] › ${WHERE}:3 › ${TITLE}\n  137 passed (2.1m)`
    expect(failureCausesNote(runLog(7000, BLOCK, tally))).toBeNull()
  })

  it('keeps a lone connection failure in its own sentence', () => {
    const block = BLOCK.replace(
      ERROR,
      'Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:4000',
    )
    const note = failureCausesNote(runLog(7000, block))!
    expect(note).toContain('1 failure in this run, and every one is a CONNECTION error')
    expect(note).toContain('Send the same file once more as it is')
    expect(note).not.toContain('fix it before')
    expect(note).not.toContain('fix this cause')
  })

  it.each([7000, MAX_OUTPUT_SIZE])(
    'recaps foreground failures before formatting (%i padding)',
    async (padding) => {
      const log = runLog(padding)
      // The 100 KB cap itself preserves failure blocks. Below that cap, the host's 8 KB
      // start/end cut loses this inline error; above it, the preserved block already fits.
      expect(displayed(truncateMiddle(log, MAX_OUTPUT_SIZE)).includes(ERROR)).toBe(
        log.length > MAX_OUTPUT_SIZE,
      )
      const tool = buildTools(backendFor(log)).find((tool) => tool.name === 'exec_command')!
      const result = (await tool.execute({ command: 'npx playwright test --reporter=list' })) as {
        note?: string
      }
      expect(result.note).toContain(ERROR)
      expect(result.note).toContain(WHERE)
      expect(result.note).toContain('Re-run just these once they are fixed:')
    },
  )

  it('delivers the error on a quick detached completion too', async () => {
    const tool = buildTools(backendFor(runLog()), {
      commandBudgetMs: 290_000,
      overCeilingGraceMs: 5000,
    }).find((tool) => tool.name === 'exec_command')!
    const result = (await tool.execute({
      command: 'npx playwright test --reporter=list | tail -60',
    })) as {
      note?: string
      taskId?: string
      exitCode?: number
    }
    expect(result.taskId).toBeUndefined()
    expect(result.exitCode).toBe(1)
    expect(result.note).toContain(ERROR)
    expect(result.note).toContain(WHERE)
  })

  it('delivers a completed wait’s error from the whole log before the 100 KB cut', async () => {
    const tool = buildTools(backendFor(runLog(MAX_OUTPUT_SIZE))).find(
      (tool) => tool.name === 'wait_for_task',
    )!
    const result = (await tool.execute({ taskId: 'mol-bg-single-review', timeout: 1 })) as {
      note?: string
    }
    expect(result.note).toContain(ERROR)
    expect(result.note).toContain(WHERE)
  })

  it('does not add a causes note to a short foreground failure or a long clean run', async () => {
    for (const log of [BLOCK, runLog(7000, '', '  138 passed (2.1m)')]) {
      const tool = buildTools(backendFor(log)).find((tool) => tool.name === 'exec_command')!
      const result = (await tool.execute({ command: 'npx playwright test' })) as { note?: string }
      expect(result.note ?? '').not.toContain('failure in this run')
      expect(result.note ?? '').not.toContain('Re-run just these')
    }
  })

  it('does not treat a printed log as a newly executed test run', async () => {
    const tool = buildTools(backendFor(runLog())).find((tool) => tool.name === 'exec_command')!
    const result = (await tool.execute({ command: 'cat invoices.log' })) as { note?: string }
    expect(result.note).toBeUndefined()
  })

  it('uses the request’s environment and exclusions on foreground re-runs too', async () => {
    const tool = buildTools(backendFor(runLog()), {
      requiredSuiteEnv: async () => [{ name: 'TEST_MODE', value: 'billing' }],
      excludedTestTitles: () => ['requires admin access'],
    }).find((tool) => tool.name === 'exec_command')!
    const result = (await tool.execute({
      command: 'npx playwright test --config billing.config.ts',
    })) as { note?: string }
    expect(result.note).toContain(ERROR)
    expect(result.note).toContain('TEST_MODE=billing')
    expect(result.note).toContain(WHERE)
    expect(result.note).toContain('--grep-invert')
    expect(result.note).toContain('requires admin access')
  })

  it('keeps stderr-only inline errors in the foreground recap', async () => {
    const backend = backendFor('')
    backend.run = vi.fn(async () => ({ stdout: '', stderr: runLog(), exitCode: 1 }))
    const tool = buildTools(backend).find((tool) => tool.name === 'exec_command')!
    const result = (await tool.execute({ command: 'npx playwright test --reporter=list' })) as {
      note?: string
    }
    expect(result.note).toContain(ERROR)
    expect(result.note).toContain(WHERE)
  })

  it('redacts a completed wait’s single-failure recap just like its stdout', async () => {
    const block = BLOCK.replace(ERROR, `${ERROR}: API_KEY=private-example-value`)
    const tool = buildTools(backendFor(runLog(7000, block))).find(
      (tool) => tool.name === 'wait_for_task',
    )!
    const result = (await tool.execute({ taskId: 'mol-bg-secret-review', timeout: 1 })) as {
      note?: string
      stdout?: string
    }
    expect(result.stdout).not.toContain('private-example-value')
    expect(result.note).toContain(ERROR)
    expect(result.note).not.toContain('private-example-value')
  })

  it('keeps one actionable error and its re-run whole beside many flaky declarations', () => {
    const flaky = Array.from(
      { length: 150 },
      (_, i) =>
        `    [chromium] › specs/browser/billing/account-history/organization-${i}/balances.spec.ts:42:3 › recovered on retry`,
    )
    const log = `${runLog()}\n  150 flaky\n${flaky.join('\n')}\n  1 failed`
    const note = failureCausesNote(log, [], { command: 'npx playwright test' })!
    expect(note).toContain(ERROR)
    expect(note).toContain('Re-run just these once they are fixed:')
    expect(note).toContain(`npx playwright test ${WHERE}`)
    expect(note.length).toBeLessThanOrEqual(TOOL_RESULT_CHARS)
  })

  it('bounds a very long error without losing its location, body evidence or narrowed command', () => {
    const log = runLog(7000, BLOCK.replace(ERROR, `${ERROR}: ${'response text '.repeat(2000)}`))
    const note = failureCausesNote(log, [], { command: 'npx playwright test' })!
    expect(note).toContain(ERROR)
    expect(note).toContain('Received string: "Pending"')
    expect(note).toContain(`npx playwright test ${WHERE}`)
    expect(note.length).toBeLessThanOrEqual(TOOL_RESULT_CHARS)
  })

  it('explicitly omits a command too long to deliver rather than offering a cut shell command', () => {
    const note = failureCausesNote(runLog(), [], {
      command: `LABEL=${'long'.repeat(2500)} npx playwright test`,
    })!
    expect(note).toContain(ERROR)
    expect(note).toContain(WHERE)
    expect(note).toContain('narrowed re-run command was omitted')
    expect(note).not.toContain('Re-run just these once they are fixed:')
    expect(note.length).toBeLessThanOrEqual(TOOL_RESULT_CHARS)
  })

  it('protects a complete narrowed command when foreground execution advice shares the result', async () => {
    const label = `LABEL=${'long'.repeat(1200)}`
    const log = runLog(7000, BLOCK.replace(ERROR, `${ERROR}: ${'response text '.repeat(2000)}`))
    const tool = buildTools(backendFor(log)).find((tool) => tool.name === 'exec_command')!
    const result = (await tool.execute({
      command: `${label} npx playwright test --reporter=list`,
    })) as {
      note?: string
      executionNote?: string
    }
    expect(result.note).toContain(`${label} npx playwright test ${WHERE}`)
    expect(result.note!.length).toBeLessThanOrEqual(TOOL_RESULT_CHARS)
    expect(displayed(result.note!)).toContain(`${label} npx playwright test ${WHERE}`)
    expect(result.executionNote).toContain('Added `--trace=retain-on-failure`')
  })

  it('describes a lone missing-base-URL failure as configuration rather than an app fix', () => {
    const log = runLog(
      7000,
      BLOCK.replace(ERROR, 'Error: page.goto: Cannot navigate to invalid URL'),
    )
    for (const command of [
      'npx playwright test',
      `LABEL=${'long'.repeat(2500)} npx playwright test`,
    ]) {
      const note = failureCausesNote(log, [], { command, config: 'billing.config.ts' })!
      expect(note).toContain('This failure is a configuration failure')
      expect(note).toContain('Nothing here is a defect to fix')
      expect(note).toContain(WHERE)
      expect(note.length).toBeLessThanOrEqual(TOOL_RESULT_CHARS)
      if (command.length > TOOL_RESULT_CHARS) expect(note).toContain('command was omitted')
      else expect(note).toContain(`npx playwright test ${WHERE}`)
    }
  })
})
