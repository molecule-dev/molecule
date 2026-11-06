import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  commandPlan,
  commandStepView,
  commandWithPlan,
  createCommandPlan,
} from '../command-plan.js'
import { suiteCommandTarget } from '../suite-overlap.js'
import { buildTools } from '../tools.js'
import { namesNoRetries } from '../trace-artifacts.js'
import type { ExecutionBackend } from '../types.js'
import {
  COMMAND_PLAN_LOG_CHARS,
  isSuiteRunCommand,
  repeatingFailure,
  runningCauseCommand,
  specFilesSelected,
  streamingBackgroundCommand,
  universalCause,
} from '../utilities.js'

const url = 'https://plain-app.example'
const browser = `BASE_URL=${url} npx playwright test notes.spec.ts --retries=1 --reporter=line`
const hurl = `hurl --test --variable host=${url} health.hurl`
const failure = (
  index = 1,
  file = 'notes.spec.ts',
  title = 'creates a note',
  retry = false,
): string =>
  [
    `  ✘  ${index} [chromium] › ${file}:10:3 › ${title}${retry ? ' (retry #1)' : ''} (1s)`,
    `  1) [chromium] › ${file}:10:3 › ${title} ──────`,
    '',
    retry ? '    Retry #1 ───────' : '',
    '    Error: Registration failed: Unable to connect to service',
    '',
  ].join('\n')
const pass = '  ✓  3 [chromium] › notes.spec.ts:20:3 › reads a note (1s)\n'

afterEach(() => vi.useRealTimers())

function fixture(commands = [browser, hurl]) {
  vi.useFakeTimers()
  const plan = createCommandPlan(commands.map((command, i) => ({ id: String(i), command })))
  const command = commandWithPlan('node /opaque/launcher.cjs <private-payload>', plan)
  const files = new Map<string, string>()
  const state = { output: '', finished: false }
  const backend: ExecutionBackend = {
    projectRoot: '/workspace',
    readFile: vi.fn(async (path) => {
      if (path.endsWith('.exit') && state.finished) return '0'
      if (files.has(path)) return files.get(path)!
      if (path.endsWith('.log')) return state.output
      throw new Error('ENOENT')
    }),
    writeFile: vi.fn(async (path, text) => {
      files.set(path, text)
    }),
    readDir: vi.fn(async () => []),
    deleteFile: vi.fn(),
    run: vi.fn(async (cmd) => {
      let stdout = ''
      if (cmd.includes('MOL_TASK_STATE'))
        stdout = `MOL_TASK_STATE alive\nMOL_TASK_EXIT\n${state.output}`
      else if (cmd.includes('tail -c') || cmd.includes(' | awk '))
        stdout = (cmd.includes('wc -c') ? `${state.output.length}\n` : '') + state.output
      else if (cmd.includes('wc -c')) stdout = String(state.output.length)
      return { stdout, stderr: '', exitCode: 0 }
    }),
  }
  const tools = buildTools(backend, { yieldOnFirstFailureFor: () => url })
  async function launch(text = command): Promise<string> {
    const result = (await tools
      .find((t) => t.name === 'exec_command')!
      .execute({ command: text, run_in_background: true })) as { taskId: string }
    expect(result.taskId).toMatch(/^mol-bg-/)
    return result.taskId
  }
  async function wait(taskId: string): Promise<Record<string, unknown>> {
    const pending = tools
      .find((t) => t.name === 'wait_for_task')!
      .execute({ taskId, timeout: 30000 })
    await vi.advanceTimersByTimeAsync(30000)
    return (await pending) as Record<string, unknown>
  }
  return { plan, command, state, backend, launch, wait }
}

describe('logical commands in opaque sequential launchers', () => {
  it('reads runner, deployed target, retry policy and selection through the shared descriptor', () => {
    const f = fixture([browser.replace('--retries=1', '--retries=0')])
    expect(isSuiteRunCommand(f.command)).toBe(true)
    expect(suiteCommandTarget(f.command)).toBe('plain-app.example')
    expect(namesNoRetries(f.command)).toBe(true)
    expect(specFilesSelected(f.command)).toBe(1)
    expect(streamingBackgroundCommand(f.command).command).toBe(f.command)
  })

  it('keeps the descriptor in the script and yields a final failure while its task is alive', async () => {
    const f = fixture()
    f.state.output = `${f.plan.steps[0]!.startMarker}\n${pass}${failure()}\n${failure(2, 'notes.spec.ts', 'creates a note', true)}`
    const id = await f.launch()
    const result = await f.wait(id)
    expect(result.status).toBe('running')
    expect(result.waitedMs).toBeLessThan(30000)
    expect(result.note).toContain('failed on its final attempt')
    expect(result).not.toHaveProperty('exitCode')
    expect(f.state.finished).toBe(false)
    expect(result.outputSoFar).not.toContain('MOL_COMMAND_STEP')
    expect(await f.wait(id)).toMatchObject({ status: 'running', waitedMs: 30000 })
  })

  it('stops early when every selected test in one file has the same cause', async () => {
    const f = fixture([browser])
    f.state.output =
      `${f.plan.steps[0]!.startMarker}\n` +
      [1, 2, 3, 4].map((n) => failure(n, 'notes.spec.ts', `note ${n}`)).join('\n')
    const result = await f.wait(await f.launch())
    expect(result.status).toBe('repeating_failure')
    expect(result.waitedMs).toBeLessThan(30000)
    expect(result.note).toContain('Every test this run has walked')
    expect(result.note).toContain('notes.spec.ts')
    expect(result.note).not.toContain('/opaque/launcher')
  })

  it('diagnoses a later step even when it executes the same logical command', async () => {
    const f = fixture([browser, browser])
    const errors = [1, 2, 3, 4].map((n) => failure(n, 'notes.spec.ts', `note ${n}`)).join('\n')
    f.state.output = `${f.plan.steps[0]!.startMarker}\n${errors}`
    const id = await f.launch()
    expect((await f.wait(id)).status).toBe('repeating_failure')
    f.state.output += `\n${f.plan.steps[0]!.endMarker}\n${f.plan.steps[1]!.startMarker}\n${errors}`
    expect((await f.wait(id)).status).toBe('repeating_failure')
  })

  it('does not yield a local wrapped final failure', async () => {
    const f = fixture([browser.replace(url, 'http://localhost:3000')])
    f.state.output = `${f.plan.steps[0]!.startMarker}\n${pass}${failure()}\n${failure(2, 'notes.spec.ts', 'creates a note', true)}`
    expect(await f.wait(await f.launch())).toMatchObject({ status: 'running', waitedMs: 30000 })
  })

  it('refreshes the pending repeated-cause count before a long wait returns it', async () => {
    const f = fixture([browser.replace(url, 'http://localhost:3000')])
    const text = (count: number): string =>
      `${f.plan.steps[0]!.startMarker}\n` +
      Array.from({ length: count }, (_, i) => failure(i + 1, 'notes.spec.ts', `note ${i}`)).join(
        '\n',
      ) +
      '\n' +
      pass
    f.state.output = text(3)
    setTimeout(() => {
      f.state.output = text(4)
    }, 16000)
    const result = await f.wait(await f.launch())
    expect(result.waitedMs).toBe(30000)
    expect(result.note).toContain('4 different tests')
    expect(result.note).not.toContain('3 different tests')
  })

  it('waits for a retry that passes and returns the task completion', async () => {
    const f = fixture()
    f.state.output = `${f.plan.steps[0]!.startMarker}\n${failure()}\n  ✓  2 [chromium] › notes.spec.ts:10:3 › creates a note (retry #1) (1s)\n${pass}`
    const id = await f.launch()
    setTimeout(() => {
      f.state.finished = true
    }, 20000)
    expect(await f.wait(id)).toMatchObject({ status: 'completed', exitCode: 0 })
  })

  it('keeps a direct Playwright run on its existing path', async () => {
    const f = fixture()
    f.state.output = `${pass}${failure()}\n${failure(2, 'notes.spec.ts', 'creates a note', true)}`
    expect((await f.wait(await f.launch(browser))).note).toContain('failed on its final attempt')
  })

  it.each([false, true])(
    'does not treat a completed Playwright step as the active Hurl step (reverse=%s)',
    async (reverse) => {
      const f = fixture(reverse ? [hurl, browser] : [browser, hurl])
      const pw = f.plan.steps[reverse ? 1 : 0]!
      const http = f.plan.steps[reverse ? 0 : 1]!
      const old = `${pw.startMarker}\n${failure()}\n${failure(2, 'notes.spec.ts', 'creates a note', true)}\n${pw.endMarker}\n`
      f.state.output = reverse
        ? `${http.startMarker}\nSuccess health.hurl\n`
        : `${old}${http.startMarker}\nSuccess health.hurl\n`
      expect(await f.wait(await f.launch())).toMatchObject({ status: 'running', waitedMs: 30000 })
      f.state.output += reverse
        ? `${http.endMarker}\n${pw.startMarker}\n${failure()}\n${failure(2, 'notes.spec.ts', 'creates a note', true)}`
        : ''
      if (reverse)
        expect((await f.wait(await f.launch())).note).toContain('failed on its final attempt')
    },
  )

  it('leaves a Hurl-only plan free of Playwright diagnostics', async () => {
    const f = fixture([hurl])
    expect(isSuiteRunCommand(f.command)).toBe(true)
    f.state.output = `${f.plan.steps[0]!.startMarker}\nSuccess health.hurl\n`
    expect(await f.wait(await f.launch())).toMatchObject({ status: 'running', waitedMs: 30000 })
  })

  it('does not use failures before the first step or between steps', async () => {
    const f = fixture()
    const final = `${failure()}\n${failure(2, 'notes.spec.ts', 'creates a note', true)}`
    expect(commandStepView(f.command, final).command).toBe('')
    expect(
      commandStepView(
        f.command,
        `${f.plan.steps[0]!.startMarker}\n${final}\n${f.plan.steps[0]!.endMarker}\n`,
      ).output,
    ).toBe('')
  })

  it('reads the walking step’s local target and retry policy independently of an earlier deployed step', async () => {
    const f = fixture([
      browser.replace('--retries=1', '--retries=0'),
      browser.replace(url, 'http://localhost:3000'),
    ])
    const first = f.plan.steps[0]!
    const second = f.plan.steps[1]!
    f.state.output = `${first.startMarker}\n${failure()}\n${first.endMarker}\n${second.startMarker}\n${pass}${failure()}\n${failure(2, 'notes.spec.ts', 'creates a note', true)}`
    expect(await f.wait(await f.launch())).toMatchObject({ status: 'running', waitedMs: 30000 })
  })

  it('does not borrow an earlier step’s zero-retry flag for the next deployed step', async () => {
    const f = fixture([browser.replace('--retries=1', '--retries=0'), browser])
    const first = f.plan.steps[0]!
    const second = f.plan.steps[1]!
    f.state.output = `${first.startMarker}\n${pass}${first.endMarker}\n${second.startMarker}\n${failure()}`
    expect(await f.wait(await f.launch())).toMatchObject({ status: 'running', waitedMs: 30000 })
  })

  it('recovers the logical plan from a durable task script without a launch in this process', async () => {
    const f = fixture([browser.replace('--retries=1', '--retries=0')])
    f.state.output = `${f.plan.steps[0]!.startMarker}\n${pass}${failure()}`
    const taskId = 'mol-bg-recovered-plan123'
    await f.backend.writeFile(`/tmp/${taskId}.sh`, f.command)
    const result = await f.wait(taskId)
    expect(result.note).toContain('failed on its final attempt')
    expect(result.waitedMs).toBeLessThan(30000)
  })

  it('refuses malformed metadata as a logical plan', () => {
    expect(commandPlan('# mol-command-plan-v1 not-json\nnode runtime')).toBeNull()
    const f = fixture()
    expect(commandPlan(commandWithPlan('node runtime', { ...f.plan, id: 'bad' }))).toBeNull()
  })

  it('retains the active boundary beyond the bounded tail and refuses a whole-history claim', () => {
    vi.useRealTimers()
    const directory = mkdtempSync(join(tmpdir(), 'logical-plan-'))
    try {
      const plan = createCommandPlan([
        { id: '0', command: browser },
        { id: '1', command: hurl },
      ])
      const command = commandWithPlan('node runtime', plan)
      const file = join(directory, 'task.log')
      const repeated = ['notes.spec.ts', 'search.spec.ts', 'profile.spec.ts']
        .map((name, i) => failure(i + 1, name, `case ${i}`))
        .join('\n')
      writeFileSync(file, `${plan.steps[0]!.startMarker}\n${'x'.repeat(45000)}\n${repeated}`)
      const whole = spawnSync('/bin/sh', ['-c', runningCauseCommand(file, undefined, command)], {
        encoding: 'utf8',
      })
      const all = commandStepView(command, whole.stdout)
      expect(all.complete).toBe(true)
      expect(universalCause(all.output, repeatingFailure(all.output), all.command)).not.toBeNull()
      writeFileSync(
        file,
        `${plan.steps[0]!.startMarker}\n${failure()}\n${pass}${'x'.repeat(45000)}\n${repeated}`,
      )
      const withPass = spawnSync('/bin/sh', ['-c', runningCauseCommand(file, undefined, command)], {
        encoding: 'utf8',
      })
      const passing = commandStepView(command, withPass.stdout)
      expect(
        universalCause(passing.output, repeatingFailure(passing.output), passing.command),
      ).toBeNull()
      writeFileSync(
        file,
        `${plan.steps[0]!.startMarker}\n${pass}${'x'.repeat(COMMAND_PLAN_LOG_CHARS + 1000)}\n${failure()}`,
      )
      const read = spawnSync('/bin/sh', ['-c', runningCauseCommand(file, undefined, command)], {
        encoding: 'utf8',
        maxBuffer: COMMAND_PLAN_LOG_CHARS + 4096,
      })
      expect(read.status, read.stderr).toBe(0)
      const view = commandStepView(command, read.stdout)
      expect(view.command).toBe(browser)
      expect(view.complete).toBe(false)
      expect(view.output).toContain('Unable to connect')
      writeFileSync(
        file,
        `${plan.steps[0]!.startMarker}\n${failure()}\n${plan.steps[0]!.endMarker}\n${plan.steps[1]!.startMarker}\nSuccess health.hurl\n`,
      )
      const next = spawnSync('/bin/sh', ['-c', runningCauseCommand(file, undefined, command)], {
        encoding: 'utf8',
      })
      expect(commandStepView(command, next.stdout)).toMatchObject({
        command: hurl,
        output: 'Success health.hurl\n',
        complete: true,
      })
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
