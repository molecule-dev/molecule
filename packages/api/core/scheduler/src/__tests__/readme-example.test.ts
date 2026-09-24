/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — through the real in-process default
 * bond (no mocks).
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-scheduler-default'

import { getStatus, schedule, setProvider, start, stop } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    stop()
  })

  it('runs the task immediately on start() and records its status', async () => {
    setProvider(createProvider({ staggerMs: 2000 }))

    const sessions = new Map<string, { expiresAt: number }>([
      ['expired', { expiresAt: Date.now() - 1000 }],
      ['live', { expiresAt: Date.now() + 60_000 }],
    ])

    schedule({
      name: 'sessions:purge-expired',
      intervalMs: 15 * 60 * 1000,
      async handler() {
        const now = Date.now()
        for (const [id, session] of sessions) if (session.expiresAt <= now) sessions.delete(id)
      },
    })

    expect(getStatus('sessions:purge-expired')?.totalRuns).toBe(0)
    start()

    await vi.waitFor(() => expect(getStatus('sessions:purge-expired')?.totalRuns).toBe(1))
    const status = getStatus('sessions:purge-expired')
    expect(status?.lastError).toBeNull()
    expect(status?.lastSuccessAt).not.toBeNull()
    expect([...sessions.keys()]).toEqual(['live'])
  })
})
