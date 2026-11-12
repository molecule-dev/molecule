import { expect, it, vi } from 'vitest'

import { commandCutRun } from '../cut-run.js'
import { buildTools } from '../tools.js'
import type { ExecutionBackend } from '../types.js'

const LOOP =
  'TOKEN=$(curl -s http://localhost:4000/api/users) && for i in 1 2 3; do timeout 25 curl -s http://localhost:4000/api/articles; done'
const stopped = { stdout: '', stderr: '', exitCode: 124 }

it('does not claim P324’s 77-second timeout loop consumed the 290-second tool budget', () => {
  expect(commandCutRun(LOOP, stopped, 77_000, 290)).toBeNull()
})

it('preserves an ordinary non-benchmark program’s early exit 124', () => {
  expect(commandCutRun('node inventory-import.mjs', stopped, 1_000, 290)).toBeNull()
})

it('still attributes a genuinely elapsed budget and a top-level command timeout', () => {
  expect(commandCutRun('curl http://localhost:4000/health', stopped, 291_000, 290)).toMatchObject({
    seconds: 290,
    stoppedBy: 'tool-budget',
  })
  expect(commandCutRun('timeout 25 node inventory-import.mjs', stopped, 25_500, 290)).toMatchObject(
    { seconds: 25, stoppedBy: 'command-timeout' },
  )
})

it('keeps the actual early exit at the exec_command caller without a fabricated elapsed-time error', async () => {
  let now = 1_000_000
  const clock = vi.spyOn(Date, 'now').mockImplementation(() => now)
  try {
    const backend = {
      projectRoot: '/workspace',
      run: async () => {
        now += 77_000
        return stopped
      },
      readFile: async () => '',
      writeFile: async () => undefined,
      deleteFile: async () => undefined,
      readDir: async () => [],
    } as ExecutionBackend
    const exec = buildTools(backend, { commandBudgetMs: 290_000, overCeilingGraceMs: 0 }).find(
      (tool) => tool.name === 'exec_command',
    )!
    const result = (await exec.execute({ command: LOOP })) as {
      exitCode?: number
      status?: string
      error?: string
    }
    expect(result.exitCode).toBe(124)
    expect(result.status).not.toBe('cut_at_budget')
    expect(result.error).toBeUndefined()
  } finally {
    clock.mockRestore()
  }
})
