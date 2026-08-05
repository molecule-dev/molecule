/**
 * Tests for suspend/resume fidelity.
 *
 * The whole point of these two functions is the boolean they return. A resume
 * that restored a process tree and one that cold-started an empty container are
 * indistinguishable afterwards — both leave a running container — so a wrong
 * `processesPreserved` means the caller skips a relaunch and the user gets a
 * sandbox that answers nothing.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import { checkpointName, hibernateContainer, resumeContainer } from '../hibernate.js'

/** One recorded Docker Engine API call. */
interface Call {
  path: string
  method: string
  body?: unknown
}

/**
 * Build a hibernation context over a scripted daemon.
 *
 * @param fail - Optional per-path failure injector.
 * @returns The context and the recorded calls.
 */
function harness(fail?: (path: string) => Error | undefined): {
  ctx: Parameters<typeof hibernateContainer>[0]
  calls: Call[]
} {
  const calls: Call[] = []
  return {
    calls,
    ctx: {
      request: async (path, method = 'GET', body) => {
        calls.push({ path, method, body })
        const error = fail?.(path)
        if (error) throw error
        return {}
      },
      checkpoints: { supported: true },
      warn: vi.fn(),
      info: vi.fn(),
    },
  }
}

describe('hibernateContainer', () => {
  it('reports processes preserved when the checkpoint succeeds', async () => {
    const { ctx, calls } = harness()
    const outcome = await hibernateContainer(ctx, 'container-abcdef123456')
    expect(outcome).toEqual({ processesPreserved: true, mechanism: 'checkpoint' })
    expect(calls[0].path).toBe('/containers/container-abcdef123456/checkpoints')
  })

  it('falls back to a stop and says so when the host has no CRIU', async () => {
    const { ctx, calls } = harness((path) =>
      path.endsWith('/checkpoints') ? new Error('Docker API POST: 501 not implemented') : undefined,
    )
    const outcome = await hibernateContainer(ctx, 'container-1')
    expect(outcome.processesPreserved).toBe(false)
    expect(outcome.mechanism).toBe('stop')
    expect(calls.some((c) => c.path === '/containers/container-1/stop')).toBe(true)
  })

  it('stops probing for CRIU once the host has said it is unavailable', async () => {
    const { ctx, calls } = harness((path) =>
      path.endsWith('/checkpoints') ? new Error('Docker API POST: 501 not implemented') : undefined,
    )
    await hibernateContainer(ctx, 'container-1')
    calls.length = 0
    await hibernateContainer(ctx, 'container-1')
    expect(calls.some((c) => c.path.endsWith('/checkpoints'))).toBe(false)
    expect(ctx.checkpoints.supported).toBe(false)
  })

  it('does NOT disable checkpointing over a single failed attempt', async () => {
    // "This checkpoint failed" and "this host cannot checkpoint" are different
    // claims; conflating them silently downgrades every later hibernation.
    const { ctx } = harness((path) =>
      path.endsWith('/checkpoints')
        ? new Error('Docker API POST: 500 criu dump failed')
        : undefined,
    )
    const outcome = await hibernateContainer(ctx, 'container-1')
    expect(outcome.processesPreserved).toBe(false)
    expect(outcome.detail).toMatch(/criu dump failed/)
    expect(ctx.checkpoints.supported).toBe(true)
    expect(ctx.warn).toHaveBeenCalled()
  })
})

describe('resumeContainer', () => {
  it('passes the checkpoint as a QUERY parameter', async () => {
    // As a body field the daemon accepts the request and performs an ordinary
    // cold start — a restore that never restores anything, and looks identical.
    const { ctx, calls } = harness()
    await resumeContainer(ctx, 'container-abcdef123456')
    const start = calls[0]
    expect(start.path).toBe(
      `/containers/container-abcdef123456/start?checkpoint=${encodeURIComponent(
        checkpointName('container-abcdef123456'),
      )}`,
    )
    expect(start.body).toBeUndefined()
  })

  it('reports processes preserved and consumes the checkpoint', async () => {
    const { ctx, calls } = harness()
    const outcome = await resumeContainer(ctx, 'container-1')
    expect(outcome).toEqual({ processesPreserved: true, mechanism: 'restore' })
    // Leaving it behind would make the NEXT resume restore a stale process tree.
    expect(calls.some((c) => c.method === 'DELETE' && c.path.includes('/checkpoints/'))).toBe(true)
  })

  it('cold-starts and reports processes lost when no checkpoint exists', async () => {
    const { ctx } = harness((path) =>
      path.includes('checkpoint=')
        ? new Error('Docker API POST: 404 no such checkpoint')
        : undefined,
    )
    const outcome = await resumeContainer(ctx, 'container-1')
    expect(outcome.processesPreserved).toBe(false)
    expect(outcome.mechanism).toBe('start')
    // A missing checkpoint is the routine shape of a stop-suspended sandbox, so
    // it must not be logged as a problem.
    expect(ctx.warn).not.toHaveBeenCalled()
  })

  it('warns when a restore fails for a reason that is NOT a missing checkpoint', async () => {
    const { ctx } = harness((path) =>
      path.includes('checkpoint=')
        ? new Error('Docker API POST: 500 criu restore failed')
        : undefined,
    )
    const outcome = await resumeContainer(ctx, 'container-1')
    expect(outcome.processesPreserved).toBe(false)
    expect(ctx.warn).toHaveBeenCalled()
  })
})
