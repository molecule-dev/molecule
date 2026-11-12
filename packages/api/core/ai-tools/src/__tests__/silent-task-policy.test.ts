import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildTools } from '../tools.js'
import type { ExecutionBackend } from '../types.js'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('explicit waits on quiet tasks', () => {
  it('continues collecting a task after long waits without output', async () => {
    vi.stubEnv('MOL_AI_BG_STUCK_AFTER_MS', '1')
    vi.useFakeTimers()
    const run = vi.fn(async () => ({ stdout: '', stderr: '', exitCode: 0 }))
    const backend: ExecutionBackend = {
      projectRoot: '/workspace',
      run,
      readFile: async () => {
        throw new Error('ENOENT')
      },
      writeFile: async () => {},
      deleteFile: async () => {},
      readDir: async () => [],
    }
    const wait = buildTools(backend).find((tool) => tool.name === 'wait_for_task')!
    const first = wait.execute({ taskId: 'mol-bg-silent00-abc123', timeout: 20 })
    await vi.advanceTimersByTimeAsync(2000)
    expect(await first).toMatchObject({ status: 'running' })
    const calls = run.mock.calls.length
    const second = wait.execute({ taskId: 'mol-bg-silent00-abc123', timeout: 20 })
    await vi.advanceTimersByTimeAsync(2000)
    const result = await second
    expect(result).toMatchObject({ status: 'running' })
    expect(run.mock.calls.length).toBeGreaterThan(calls)
    expect(JSON.stringify(result)).not.toContain('do not wait')
    expect(JSON.stringify(result)).not.toContain('Kill it')
  })
})
