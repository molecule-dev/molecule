/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real queue core. The
 * provider is pure in-process, so nothing is mocked; fake timers stand in for
 * the 60-second delay.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { send, setProvider, subscribe } from '@molecule/api-queue'

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('delivers immediately, honors delaySeconds, and stops on unsubscribe', async () => {
    vi.useFakeTimers()
    const queueProvider = createProvider()
    setProvider(queueProvider)

    interface WelcomeEmailJob {
      to: string
      name: string
    }
    const greeted: string[] = []

    const unsubscribe = subscribe<WelcomeEmailJob>('emails', async (message) => {
      greeted.push(`Welcome, ${message.body.name} <${message.body.to}>`)
    })

    await send<WelcomeEmailJob>('emails', { body: { to: 'ada@example.com', name: 'Ada' } })
    await send<WelcomeEmailJob>('emails', {
      body: { to: 'grace@example.com', name: 'Grace' },
      delaySeconds: 60,
    })

    await vi.advanceTimersByTimeAsync(100)
    expect(greeted).toEqual(['Welcome, Ada <ada@example.com>'])

    await vi.advanceTimersByTimeAsync(59_000)
    expect(greeted).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(1_500)
    expect(greeted).toEqual([
      'Welcome, Ada <ada@example.com>',
      'Welcome, Grace <grace@example.com>',
    ])

    unsubscribe()
    await send<WelcomeEmailJob>('emails', { body: { to: 'late@example.com', name: 'Late' } })
    await vi.advanceTimersByTimeAsync(5_000)
    expect(greeted).toHaveLength(2)

    await queueProvider.close?.()
  })
})
