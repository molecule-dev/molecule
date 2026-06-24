// @vitest-environment jsdom

/**
 * Security tests for the OAuth-popup relay in {@link useOAuth}.
 *
 * The opener establishes a session from a `postMessage` the popup sends back. The
 * WHOLE security of the popup flow rests on the opener accepting that message ONLY
 * when it is same-origin, from the exact popup window it opened, and carries our
 * private message type. These tests prove a forged message of each kind is rejected
 * and only the genuine one establishes a session.
 */

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockClient = {
  setAccessToken: vi.fn(),
  setUser: vi.fn(),
  initialize: vi.fn(async () => {}),
}
// Mock the auth client the hook seeds the session into.
vi.mock('../useAuth.js', () => ({ useAuthClient: () => mockClient }))

import { useOAuth } from '../useOAuth.js'

const ORIGIN = window.location.origin
const TYPE = 'molecule:oauth-result'

/** Build a message event with forced origin + source (jsdom-reliable). */
function makeMessage(opts: { origin?: string; source?: unknown; data?: unknown }): MessageEvent {
  const ev = new MessageEvent('message', { data: opts.data })
  Object.defineProperty(ev, 'origin', { value: opts.origin ?? ORIGIN })
  Object.defineProperty(ev, 'source', { value: opts.source })
  return ev
}

const flush = (): Promise<void> => act(async () => void (await Promise.resolve()))

describe('useOAuth.loginViaPopup — postMessage relay security', () => {
  let fakePopup: { closed: boolean; close: ReturnType<typeof vi.fn> }
  let openSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    fakePopup = { closed: false, close: vi.fn() }
    openSpy = vi.spyOn(window, 'open').mockReturnValue(fakePopup as unknown as Window)
  })
  afterEach(() => openSpy.mockRestore())

  function startPopup(onSuccess?: () => void, onError?: (m: string) => void): void {
    const { result } = renderHook(() =>
      useOAuth({ oauthProviders: ['github'], onSuccess, onError }),
    )
    act(() => result.current.loginViaPopup('github'))
  }

  const VALID = { type: TYPE, ok: true, token: 'real-token', user: { id: 'u1' } }

  it('accepts a same-origin result from OUR popup and establishes the session', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    window.dispatchEvent(makeMessage({ origin: ORIGIN, source: fakePopup, data: VALID }))
    await flush()
    expect(mockClient.setAccessToken).toHaveBeenCalledWith('real-token')
    expect(mockClient.setUser).toHaveBeenCalledWith({ id: 'u1' })
    expect(mockClient.initialize).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(fakePopup.close).toHaveBeenCalled()
  })

  it('REJECTS a cross-origin message (session fixation attempt) — no session', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    window.dispatchEvent(
      makeMessage({
        origin: 'https://evil.example',
        source: fakePopup,
        data: { ...VALID, token: 'attacker' },
      }),
    )
    await flush()
    expect(mockClient.setAccessToken).not.toHaveBeenCalled()
    expect(mockClient.initialize).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('REJECTS a same-origin message from a DIFFERENT window (source mismatch)', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    window.dispatchEvent(
      makeMessage({
        origin: ORIGIN,
        source: { closed: false },
        data: { ...VALID, token: 'attacker' },
      }),
    )
    await flush()
    expect(mockClient.setAccessToken).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('IGNORES a same-origin message from our popup with the WRONG type', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    window.dispatchEvent(
      makeMessage({
        origin: ORIGIN,
        source: fakePopup,
        data: { type: 'other', ok: true, token: 'x', user: { id: 'z' } },
      }),
    )
    await flush()
    expect(mockClient.setAccessToken).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('relays an error result to onError without establishing a session', async () => {
    const onError = vi.fn()
    startPopup(undefined, onError)
    window.dispatchEvent(
      makeMessage({
        origin: ORIGIN,
        source: fakePopup,
        data: { type: TYPE, ok: false, error: 'denied' },
      }),
    )
    await flush()
    expect(onError).toHaveBeenCalledWith('denied')
    expect(mockClient.setAccessToken).not.toHaveBeenCalled()
  })

  it('treats a success result with no user as a failure (no half-auth)', async () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()
    startPopup(onSuccess, onError)
    window.dispatchEvent(
      makeMessage({
        origin: ORIGIN,
        source: fakePopup,
        data: { type: TYPE, ok: true, token: 'tok', user: null },
      }),
    )
    await flush()
    expect(mockClient.initialize).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalled()
  })

  it('processes only the FIRST valid result (no double-handling)', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    const msg = makeMessage({ origin: ORIGIN, source: fakePopup, data: VALID })
    window.dispatchEvent(msg)
    await flush()
    window.dispatchEvent(makeMessage({ origin: ORIGIN, source: fakePopup, data: VALID }))
    await flush()
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(mockClient.initialize).toHaveBeenCalledTimes(1)
  })
})
