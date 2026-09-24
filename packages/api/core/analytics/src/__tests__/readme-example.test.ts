/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Mixpanel bond. Only the
 * Mixpanel SDK (the network client) is mocked, the same way the bond's own
 * tests mock it.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

type Callback = (err?: Error) => void

const { peopleSet, mixpanelTrack } = vi.hoisted(() => ({
  peopleSet: vi.fn((_id: string, _props: Record<string, unknown>, cb: Callback) => cb()),
  mixpanelTrack: vi.fn((_name: string, _props: Record<string, unknown>, cb: Callback) => cb()),
}))

vi.mock('mixpanel', () => ({
  default: {
    init: vi.fn(() => ({
      people: { set: peopleSet },
      track: mixpanelTrack,
      groups: { set: vi.fn() },
    })),
  },
}))

import Mixpanel from 'mixpanel'

import { createProvider } from '@molecule/api-analytics-mixpanel'
import { logger } from '@molecule/api-logger'

import { identify, setProvider, track } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('bonds Mixpanel, identifies the user and tracks attributed events', async () => {
    vi.stubEnv('MIXPANEL_TOKEN', 'mp-test-token')

    setProvider(createProvider({ token: process.env.MIXPANEL_TOKEN }))
    expect(Mixpanel.init).toHaveBeenCalledWith('mp-test-token', { debug: false })

    await identify({ userId: 'u_123', email: 'user@example.com', name: 'Ada' })
    await track({ name: 'purchase.completed', userId: 'u_123', properties: { amount: 49.99 } })

    const warn = vi.spyOn(logger, 'warn')
    await track({ name: 'report.viewed', userId: 'u_123' }).catch((error) => {
      logger.warn('analytics track failed', { error })
    })

    expect(peopleSet).toHaveBeenCalledWith(
      'u_123',
      { $email: 'user@example.com', $name: 'Ada' },
      expect.any(Function),
    )
    expect(mixpanelTrack).toHaveBeenCalledWith(
      'purchase.completed',
      { distinct_id: 'u_123', time: undefined, amount: 49.99 },
      expect.any(Function),
    )
    expect(mixpanelTrack).toHaveBeenCalledWith(
      'report.viewed',
      { distinct_id: 'u_123', time: undefined },
      expect.any(Function),
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
