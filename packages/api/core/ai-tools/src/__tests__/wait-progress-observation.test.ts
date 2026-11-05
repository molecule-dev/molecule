import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildTools } from '../tools.js'
import type { ExecutionBackend } from '../types.js'

describe('wait progress observation interval', () => {
  afterEach(() => vi.useRealTimers())

  /** A live background build or suite with a readable log and no exit file yet. */
  function liveTask(slice: string) {
    let size = 17_365
    const backend: ExecutionBackend = {
      projectRoot: '/project',
      readFile: vi.fn(async () => {
        throw new Error('ENOENT')
      }),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      readDir: vi.fn(),
      run: vi.fn(async (command: string) => ({
        stdout: command.includes('wc -c') ? String(size) : slice,
        stderr: '',
        exitCode: 0,
      })),
    }
    const taskId = `mol-bg-${(Date.now() - 280_000).toString(36)}-progress`
    const wait = buildTools(backend).find((tool) => tool.name === 'wait_for_task')!
    return {
      grow: () => (size += 500),
      async collect(timeout: number) {
        const pending = wait.execute({ taskId, timeout })
        await vi.advanceTimersByTimeAsync(timeout)
        return (await pending) as { status: string; note: string; waitedMs: number }
      },
    }
  }

  it.each([
    '[104/138] [chromium] › navigation.spec.ts:1:1 › pagination\n',
    '> npm run build\ntransforming modules...\n',
  ])('makes no growth claim on a 1 ms state probe: %s', async (slice) => {
    vi.useFakeTimers()
    const task = liveTask(slice)
    await task.collect(2_000)

    const result = await task.collect(1)

    expect(result.status).toBe('running')
    expect(result.waitedMs).toBe(1)
    expect(result.note).not.toContain('has not grown during this wait')
    expect(result.note).not.toContain('still growing')
    expect(result.note).toContain('has been running 4 min')
    if (slice.startsWith('[104/138]')) {
      expect(result.note).toContain('its log is at 104 of 138')
      expect(result.note).toContain('left at that rate')
    }

    task.grow()
    const grownBeforeProbe = await task.collect(1)
    expect(grownBeforeProbe.note).not.toContain('has not grown during this wait')
    expect(grownBeforeProbe.note).not.toContain('still growing')
  })

  it.each([false, true])(
    'reports observed growth truthfully over a full 150 s wait (growing: %s)',
    async (growing) => {
      vi.useFakeTimers()
      const task = liveTask('> npm run build\ntransforming modules...\n')
      await task.collect(2_000)
      const growthTimer = growing ? setTimeout(task.grow, 70_000) : undefined

      const result = await task.collect(150_000)
      if (growthTimer !== undefined) clearTimeout(growthTimer)

      expect(result).toMatchObject({ status: 'running', waitedMs: 150_000 })
      expect(result.note).toContain(growing ? 'still growing' : 'has not grown during this wait')
      expect(result.note).not.toContain(
        growing ? 'has not grown during this wait' : 'still growing',
      )
    },
  )
})
