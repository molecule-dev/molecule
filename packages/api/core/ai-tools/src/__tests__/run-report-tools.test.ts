/**
 * The machine report as the EXECUTION TOOLS actually carry it (../tools.ts).
 *
 * These are the seams the diagnostic layer reads: `exec_command`'s returned result, the launch of a
 * background suite and the completed `wait_for_task`. The report text is a genuine Playwright
 * report (see ./fixtures/playwright-run.ts) fed through a fake backend, so the assertions cover the
 * wiring — the command the backend really runs, and the record the result really carries — rather
 * than the reader alone.
 *
 * The "before" state these tests are red against is the whole capability: no `runReport` field, no
 * `json` reporter on the launched command. Without the wiring, each test below fails at its first
 * claim.
 */
import { afterAll, describe, expect, it, vi } from 'vitest'

import { buildTools } from '../tools.js'
import type { ExecutionBackend } from '../types.js'
import {
  type GenuineRun,
  installedPlaywright,
  runTinyPlaywright,
} from './fixtures/playwright-run.js'

const playwright = installedPlaywright()

/** Two failing tests in one spec: two identities, two attempts' worth of artifacts. */
const TWO_FAILURES = `
test('first failure', () => {
  expect(1 + 1).toBe(3)
})

test('second failure', () => {
  expect('a').toBe('b')
})
`

/** The genuine report both tests are built on, run once for the file. */
let cached: GenuineRun | null | undefined
function genuineRun(): GenuineRun | null {
  if (cached === undefined) cached = runTinyPlaywright(TWO_FAILURES)
  return cached
}
afterAll(() => cached?.cleanup())

/**
 * A backend whose files are a map, whose commands are recorded, and whose report file answers the
 * text it is given.
 *
 * @param files - The files the backend can read, by absolute path.
 * @param result - What every `run` returns.
 * @returns The backend, the commands it ran, and its file map (writes land in it).
 */
function fakeBackend(
  files: Record<string, string> = {},
  result: { stdout: string; stderr: string; exitCode: number } = {
    stdout: '2 failed',
    stderr: '',
    exitCode: 1,
  },
): { backend: ExecutionBackend; runs: string[]; files: Record<string, string> } {
  const runs: string[] = []
  const backend: ExecutionBackend = {
    projectRoot: '/workspace',
    readFile: vi.fn(async (path: string) => {
      if (path in files) return files[path] as string
      throw new Error(`ENOENT: no such file or directory, open '${path}'`)
    }),
    writeFile: vi.fn(async (path: string, content: string) => {
      files[path] = content
    }),
    deleteFile: vi.fn(async () => undefined),
    readDir: vi.fn(async () => []),
    run: vi.fn(async (command: string) => {
      runs.push(command)
      return result
    }),
  }
  return { backend, runs, files }
}

/** The tool with one name, from a tool set built on `backend`. */
function tool(
  backend: ExecutionBackend,
  name: string,
): {
  execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>
} {
  const found = buildTools(backend).find((one) => one.name === name)
  if (found === undefined) throw new Error(`${name} was not built`)
  return found as unknown as {
    execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>
  }
}

describe('exec_command carries a finished run’s machine report', () => {
  it.skipIf(playwright === null)(
    'adds json to the executor’s reporters and returns the runner’s own identities',
    async () => {
      const genuine = genuineRun()
      if (genuine === null) throw new Error('Playwright disappeared mid-test')
      const { backend, runs } = fakeBackend()
      const reportText = genuine.report
      backend.readFile = vi.fn(async (path: string) => {
        if (/^\/tmp\/mol-pw-[a-z0-9-]+\.playwright\.json$/.test(path)) return reportText
        throw new Error(`ENOENT: ${path}`)
      })
      const result = await tool(backend, 'exec_command').execute({
        command: 'npx playwright test --reporter=list',
      })
      // The command the backend actually ran: the executor's printer is kept and json is added,
      // with the report written to this call's own file.
      expect(runs[0]).toContain('--reporter=list,json')
      expect(runs[0]).toContain('export PLAYWRIGHT_JSON_OUTPUT_FILE=')
      // The run's own result is untouched: the verdict is still the exit code and the log.
      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe('2 failed')
      const report = result.runReport as {
        status: string
        path: string
        failures: Array<{ file: string; line: number; title: string; error: string | null }>
        omittedFailures: number
      }
      expect(report.status).toBe('complete')
      expect(report.omittedFailures).toBe(0)
      expect(report.path.endsWith('.playwright.json')).toBe(true)
      // Two failures in one spec stay two identities, with the runner's own declaration lines.
      expect(report.failures).toHaveLength(2)
      expect(report.failures.map((one) => one.title)).toEqual(['first failure', 'second failure'])
      expect(new Set(report.failures.map((one) => `${one.file}:${one.line}`)).size).toBe(2)
      // The error text is the runner's, and the terminal colouring is gone.
      expect(report.failures[0]?.error).toContain('Expected')
      expect(report.failures[0]?.error).not.toContain('\u001B')
    },
    60_000,
  )

  it('leaves a run that names its own reporters alone when it has no reporter flag', async () => {
    // The suite config's reporters are not this tool's to replace.
    const { backend, runs } = fakeBackend()
    const result = await tool(backend, 'exec_command').execute({ command: 'npx playwright test' })
    expect(runs[0]).not.toContain('PLAYWRIGHT_JSON_OUTPUT_FILE')
    expect(runs[0]).not.toContain('reporter')
    expect(result.runReport).toBeUndefined()
  })

  it('never takes over the executor’s own json report', async () => {
    const { backend, runs } = fakeBackend()
    const command = 'npx playwright test --reporter=json'
    const result = await tool(backend, 'exec_command').execute({ command })
    expect(runs[0]).toContain('--reporter=json')
    expect(runs[0]).not.toContain('json,')
    expect(runs[0]).not.toContain('PLAYWRIGHT_JSON_OUTPUT_FILE')
    expect(result.runReport).toBeUndefined()
  })

  it('says a malformed report is malformed instead of returning an empty failure list', async () => {
    const { backend } = fakeBackend()
    backend.readFile = vi.fn(async () => '{"stats":')
    const result = await tool(backend, 'exec_command').execute({
      command: 'npx playwright test --reporter=list',
    })
    const report = result.runReport as { status: string; stats: unknown; failures: unknown[] }
    expect(report.status).toBe('malformed')
    expect(report.stats).toBeNull()
    expect(report.failures).toEqual([])
  })

  it('says a run that left no report is missing, not clean', async () => {
    const { backend } = fakeBackend()
    backend.readFile = vi.fn(async () => {
      throw new Error('ENOENT')
    })
    const result = await tool(backend, 'exec_command').execute({
      command: 'npx playwright test --reporter=list',
    })
    const report = result.runReport as { status: string; stats: unknown }
    expect(report.status).toBe('missing')
    expect(report.stats).toBeNull()
  })
})

describe('a background suite hands its report back on wait_for_task', () => {
  it.skipIf(playwright === null)(
    'writes the report beside the task’s log and returns it on completion',
    async () => {
      const genuine = genuineRun()
      if (genuine === null) throw new Error('Playwright disappeared mid-test')
      const { backend, files } = fakeBackend()
      const exec = tool(backend, 'exec_command')
      const launched = await exec.execute({
        command: 'npx playwright test',
        run_in_background: true,
      })
      const taskId = String(launched.taskId)
      expect(taskId).toMatch(/^mol-bg-/)
      // The script actually launched carries both the reporter and the file option, and the suite's
      // own settings are still there (a local run keeps `--retries=0`; nothing here re-selects).
      const script = files[`/tmp/${taskId}.sh`] ?? ''
      expect(script).toContain('--reporter=list,json')
      expect(script).toContain(`PLAYWRIGHT_JSON_OUTPUT_FILE='/tmp/${taskId}.playwright.json'`)
      expect(script).toContain('--retries=0')
      // A finished run: the exit file, its log, and the report the launch would have written.
      files[`/tmp/${taskId}.exit`] = '1'
      files[`/tmp/${taskId}.log`] = '2 failed\n'
      files[`/tmp/${taskId}.playwright.json`] = genuine.report
      const waited = await tool(backend, 'wait_for_task').execute({ taskId })
      expect(waited.status).toBe('completed')
      const report = waited.runReport as {
        status: string
        failures: Array<{ title: string; attachments: Array<{ name: string; path: string }> }>
      }
      expect(report.status).toBe('complete')
      expect(report.failures).toHaveLength(2)
      // Attachment ownership rides with the identity it belongs to, not with the run.
      for (const failure of report.failures) {
        expect(failure.attachments[0]?.name).toBe('error-context')
        expect(failure.attachments[0]?.path).toContain(failure.title.replaceAll(' ', '-'))
      }
    },
    60_000,
  )
})
