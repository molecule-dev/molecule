/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProvider, setProvider } from '@molecule/app-ai-assistant'

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bonds the provider and streams a reply from the backend endpoint', async () => {
    const sse =
      'data: {"type":"text","content":"Open Settings "}\n' +
      'data: {"type":"text","content":"> Billing."}\n' +
      'data: {"type":"done"}\n'
    const fetchMock = vi.fn(async () => new Response(sse, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const sessionToken = 'user-session-jwt'
    setProvider(
      createProvider({ baseUrl: '', headers: { Authorization: `Bearer ${sessionToken}` } }),
    )

    const assistant = requireProvider()
    const config = { endpoint: '/api/assistant', systemContext: 'User is on the billing page.' }

    const seen: boolean[] = []
    const unsubscribe = assistant.subscribe((state) => {
      seen.push(state.isLoading)
    })
    assistant.open(config)
    const onEvent = vi.fn()
    await assistant.sendMessage('How do I upgrade my plan?', config, onEvent)

    const state = assistant.getState()
    const reply = state.messages.at(-1)?.content
    unsubscribe()

    expect(reply).toBe('Open Settings > Billing.')
    expect(state.isOpen).toBe(true)
    expect(state.isLoading).toBe(false)
    expect(seen).toContain(true)
    expect(onEvent).toHaveBeenCalledWith({ type: 'done' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/assistant')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer user-session-jwt')
    expect(JSON.parse(init.body as string)).toEqual({
      message: 'How do I upgrade my plan?',
      systemContext: 'User is on the billing page.',
    })
  })
})
