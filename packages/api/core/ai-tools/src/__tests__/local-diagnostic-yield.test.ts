import { afterEach, expect, it, vi } from 'vitest'

import { buildTools } from '../tools.js'
import type { ExecutionBackend } from '../types.js'

afterEach(() => vi.useRealTimers())

const failure = `  ✘  1 [chromium] › preferences.spec.ts:8:3 › Preferences › saves settings (10s)
  1) [chromium] › preferences.spec.ts:8:3 › Preferences › saves settings

    TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
    Call log:
      - waiting for navigation until "load"
`

async function fixture(retries = 0) {
  vi.useFakeTimers()
  const files = new Map<string, string>()
  const state = { text: failure, ended: false }
  const backend: ExecutionBackend = {
    projectRoot: '/workspace',
    readFile: vi.fn(async (path) => {
      if (path.endsWith('.exit') && state.ended) return '0'
      if (files.has(path)) return files.get(path)!
      if (path.endsWith('.log')) return state.text
      throw new Error('ENOENT')
    }),
    writeFile: vi.fn(async (path, text) => {
      files.set(path, text)
    }),
    readDir: vi.fn(async () => []),
    deleteFile: vi.fn(),
    run: vi.fn(async (command) => ({
      stdout: command.includes('MOL_TASK_STATE')
        ? `MOL_TASK_STATE alive\nMOL_TASK_EXIT\n${state.text}`
        : command.includes('tail -c') || command.includes(' | awk ')
          ? (command.includes('wc -c') ? `${state.text.length}\n` : '') + state.text
          : command.includes('wc -c')
            ? String(state.text.length)
            : '',
      stderr: '',
      exitCode: 0,
    })),
  }
  const tools = buildTools(backend)
  const command = `BASE_URL=http://127.0.0.1:4173 npx playwright test --retries=${retries} --max-failures=15`
  const launched = (await tools
    .find((t) => t.name === 'exec_command')!
    .execute({ command, run_in_background: true })) as { taskId: string }
  const wait = async (timeout = 30000) => {
    const pending = tools
      .find((t) => t.name === 'wait_for_task')!
      .execute({ taskId: launched.taskId, timeout })
    await vi.advanceTimersByTimeAsync(timeout)
    return (await pending) as Record<string, unknown>
  }
  return { state, wait }
}

it('returns a definite local diagnostic promptly and requires the mutable run to end before edits', async () => {
  const f = await fixture()
  const result = await f.wait(290000)
  expect(result.status).toBe('running')
  expect(result.waitedMs).toBeLessThan(3000)
  expect(result.exitCode).toBeUndefined()
  expect(result.note).toContain('mutable local source')
  expect(result.note).toContain('Before editing app source')
  expect(result.note).toContain('stop this diagnostic and collect its stopped result')
  expect(result.note).not.toContain('Local edits do not change this deployed build')
  expect(result.note).not.toContain('deploy now')
  expect(result.note).not.toContain('until the deploy lands')
  // Deliver each cause once; another wait can collect the rest without a busy loop.
  expect((await f.wait()).waitedMs).toBe(30000)
})

it('keeps waiting when a local first attempt can still pass on retry', async () => {
  const f = await fixture(1)
  expect(await f.wait()).toMatchObject({ status: 'running', waitedMs: 30000 })
})

it('returns a completed passing run before any diagnostic yield', async () => {
  const f = await fixture()
  f.state.text = '  4 passed (1s)\n'
  f.state.ended = true
  expect(await f.wait()).toMatchObject({ status: 'completed', exitCode: 0 })
})
