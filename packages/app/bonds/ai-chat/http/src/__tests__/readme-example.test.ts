/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProvider, setProvider } from '@molecule/app-ai-chat'

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bonds the HTTP provider, streams the reply, and loads history', async () => {
    const sse =
      'data: {"type":"text","content":"You have "}\n' +
      'data: {"type":"text","content":"2 open tasks."}\n' +
      'data: {"type":"done"}\n'
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method !== 'POST') {
        return new Response(
          JSON.stringify({
            messages: [
              { id: 'm1', role: 'user', content: 'Summarize my open tasks', timestamp: 1 },
              { id: 'm2', role: 'assistant', content: 'You have 2 open tasks.', timestamp: 2 },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response(sse, { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ baseUrl: '', headers: { 'X-Client': 'web' } }))

    const chat = requireProvider()
    const config = { endpoint: '/api/ai/chat', model: 'claude-sonnet-4-5' }

    let reply = ''
    const errors: string[] = []
    await chat.sendMessage('Summarize my open tasks', config, (event) => {
      if (event.type === 'text') reply += event.content
      if (event.type === 'error') errors.push(event.message)
    })

    expect(reply).toBe('You have 2 open tasks.')
    expect(errors).toEqual([])

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/ai/chat')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['X-Client']).toBe('web')
    expect(JSON.parse(init.body as string)).toEqual({
      message: 'Summarize my open tasks',
      model: 'claude-sonnet-4-5',
    })

    const history = await chat.loadHistory(config)
    expect(history.map((m) => m.content)).toEqual([
      'Summarize my open tasks',
      'You have 2 open tasks.',
    ])
  })
})
