/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the HTTP/SSE bond.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/app-ai-chat-http'

import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bonds the HTTP provider, streams the reply, and loads history', async () => {
    const sse =
      'data: {"type":"text","content":"You have "}\n' +
      'data: {"type":"text","content":"3 open orders."}\n' +
      'data: {"type":"done"}\n'
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method !== 'POST') {
        return new Response(
          JSON.stringify({
            messages: [
              { id: 'm1', role: 'user', content: 'Summarize my open orders', timestamp: 1 },
              { id: 'm2', role: 'assistant', content: 'You have 3 open orders.', timestamp: 2 },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response(sse, { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ baseUrl: '' }))

    const chat = requireProvider()
    const config = { endpoint: '/api/chat' }

    let reply = ''
    const errors: string[] = []
    await chat.sendMessage('Summarize my open orders', config, (event) => {
      if (event.type === 'text') reply += event.content
      if (event.type === 'error') errors.push(event.message)
    })

    expect(reply).toBe('You have 3 open orders.')
    expect(errors).toEqual([])
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/chat')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ message: 'Summarize my open orders' })

    const history = await chat.loadHistory(config)
    expect(history.map((m) => m.content)).toEqual([
      'Summarize my open orders',
      'You have 3 open orders.',
    ])
  })
})
