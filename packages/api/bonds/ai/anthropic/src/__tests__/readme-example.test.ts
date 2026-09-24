/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real `@molecule/api-ai`
 * core. Only the network is mocked: `fetch` returns a real Messages API SSE stream.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TokenUsage } from '@molecule/api-ai'
import { requireProvider, setProvider } from '@molecule/api-ai'

import { createProvider } from '../index.js'

/**
 * Builds an Anthropic Messages API streaming (SSE) response.
 *
 * @param events - The Anthropic stream events, in order.
 * @returns The fetch Response.
 */
function sseResponse(events: Array<Record<string, unknown>>): Response {
  const body = events
    .map((e) => `event: ${String(e.type)}\ndata: ${JSON.stringify(e)}\n\n`)
    .join('')
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds Anthropic by name and streams the reply through the core', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    vi.stubEnv('ANTHROPIC_BASE_URL', undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      sseResponse([
        { type: 'message_start', message: { usage: { input_tokens: 14, output_tokens: 1 } } },
        { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '2 + 2' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' = 4.' } },
        { type: 'content_block_stop', index: 0 },
        {
          type: 'message_delta',
          delta: { stop_reason: 'end_turn' },
          usage: { output_tokens: 8 },
        },
        { type: 'message_stop' },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider('anthropic', createProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))

    let reply = ''
    let usage: TokenUsage | undefined
    for await (const event of requireProvider().chat({
      messages: [{ role: 'user', content: 'What is 2 + 2?' }],
      maxTokens: 256,
    })) {
      if (event.type === 'text') reply += event.content
      if (event.type === 'error') throw new Error(event.message)
      if (event.type === 'done') usage = event.usage
    }

    expect(reply).toBe('2 + 2 = 4.')
    expect(usage).toMatchObject({ inputTokens: 14, outputTokens: 8 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('test-key')
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: 'claude-opus-5-5',
      max_tokens: 256,
      stream: true,
      messages: [{ role: 'user', content: 'What is 2 + 2?' }],
    })
  })
})
