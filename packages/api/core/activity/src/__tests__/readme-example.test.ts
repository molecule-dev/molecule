/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the console sink bond.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

const info = vi.fn()

vi.mock('@molecule/api-logger', () => ({
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: (...args: unknown[]) => info(...args),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { provider } from '@molecule/api-activity-console'

import { record, setSink } from '../index.js'

describe('README @example', () => {
  it('bonds the console sink and records an activity event to it', async () => {
    setSink(provider)

    await record({
      id: crypto.randomUUID(),
      type: 'email',
      status: 'captured',
      recipient: 'user@example.com',
      summary: 'Welcome email',
      timestamp: new Date().toISOString(),
    })

    expect(info).toHaveBeenCalledTimes(1)
    expect(info.mock.calls[0]?.[0]).toBe(
      '[activity] email captured → user@example.com: Welcome email',
    )
  })
})
