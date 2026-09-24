/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — through the real in-memory bond (no
 * mocks).
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-queue-memory'

import { send, setProvider, subscribe } from '../index.js'

interface WelcomeJob {
  userId: string
}

describe('README @example', () => {
  it('delivers an enqueued job to the subscriber once, and holds a delayed one back', async () => {
    const provider = createProvider()
    setProvider(provider)

    const welcomed = new Set<string>()
    const seen: string[] = []
    const stop = subscribe<WelcomeJob>('welcome-emails', async (message) => {
      const { userId } = message.body
      seen.push(userId)
      if (welcomed.has(userId)) return
      welcomed.add(userId)
    })

    const messageId = await send<WelcomeJob>('welcome-emails', { body: { userId: 'user-123' } })
    await send<WelcomeJob>('welcome-emails', { body: { userId: 'user-456' }, delaySeconds: 60 })

    expect(typeof messageId).toBe('string')
    await vi.waitFor(() => expect(welcomed.has('user-123')).toBe(true))
    // The 60-second delayed job is not delivered yet.
    expect(welcomed.has('user-456')).toBe(false)
    expect(seen).toEqual(['user-123'])

    stop()
    await provider.close?.()
  })
})
