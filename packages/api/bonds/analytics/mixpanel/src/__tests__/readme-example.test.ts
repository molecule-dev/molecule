/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the `mixpanel` SDK is mocked.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { identify, setProvider, track } from '@molecule/api-analytics'

import { createProvider } from '../index.js'

type Callback = (err: Error | undefined) => void

const { init, peopleSet, mixpanelTrack } = vi.hoisted(() => {
  const peopleSet = vi.fn(
    (_id: string, _props: Record<string, unknown>, cb: (err: Error | undefined) => void) =>
      cb(undefined),
  )
  const mixpanelTrack = vi.fn(
    (_name: string, _props: Record<string, unknown>, cb: (err: Error | undefined) => void) =>
      cb(undefined),
  )
  const init = vi.fn(() => ({
    people: { set: peopleSet },
    track: mixpanelTrack,
    groups: { set: vi.fn() },
  }))
  return { init, peopleSet, mixpanelTrack }
})

vi.mock('mixpanel', () => ({ default: { init } }))

describe('README @example', () => {
  const originalToken = process.env.MIXPANEL_TOKEN

  afterEach(() => {
    if (originalToken === undefined) delete process.env.MIXPANEL_TOKEN
    else process.env.MIXPANEL_TOKEN = originalToken
    vi.restoreAllMocks()
  })

  it('identifies the user and tracks an attributed event through Mixpanel', async () => {
    process.env.MIXPANEL_TOKEN = 'test-token'
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    setProvider(
      createProvider({
        token: process.env.MIXPANEL_TOKEN,
        groupType: 'workspace',
      }),
    )

    await identify({ userId: 'u_123', email: 'ada@example.com', name: 'Ada Lovelace' })
    await track({
      name: 'purchase.completed',
      userId: 'u_123',
      properties: { plan: 'pro', amountCents: 4900 },
    }).catch((error) => console.error('mixpanel track failed', error))

    expect(init).toHaveBeenCalledWith('test-token', { debug: false })
    expect(peopleSet).toHaveBeenCalledWith(
      'u_123',
      { $email: 'ada@example.com', $name: 'Ada Lovelace' },
      expect.any(Function),
    )
    expect(mixpanelTrack).toHaveBeenCalledWith(
      'purchase.completed',
      { distinct_id: 'u_123', time: undefined, plan: 'pro', amountCents: 4900 },
      expect.any(Function),
    )
    expect(logError).not.toHaveBeenCalled()
  })

  it('surfaces a rejected send to the .catch() handler', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mixpanelTrack.mockImplementationOnce((_name, _props, cb: Callback) =>
      cb(new Error('Mixpanel Server Error: 500')),
    )
    setProvider(createProvider({ token: 'test-token', groupType: 'workspace' }))

    await track({ name: 'purchase.completed', userId: 'u_123' }).catch((error) =>
      console.error('mixpanel track failed', error),
    )

    expect(logError).toHaveBeenCalledWith('mixpanel track failed', expect.any(Error))
  })
})
