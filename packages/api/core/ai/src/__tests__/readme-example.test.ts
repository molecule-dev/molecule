/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Anthropic bond. Only the
 * network is mocked: `fetch` returns a real Messages-API SSE stream.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-ai-anthropic'

import type { ChatParams } from '../index.js'
import { requireProvider, setProvider } from '../index.js'

/**
 * Builds a streaming fetch Response from Anthropic SSE event objects.
 *
 * @param events - The SSE `data:` payloads, in order.
 * @returns A minimal streaming Response.
 */
function sseResponse(events: Array<Record<string, unknown>>): Response {
  const text = events.map((e) => `data: ${JSON.stringify(e)}`).join('\n') + '\n'
  return new Response(new TextEncoder().encode(text), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds the Anthropic provider and streams a text reply through chat()', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const fetchMock = vi.fn(async () =>
      sseResponse([
        { type: 'message_start', message: { usage: { input_tokens: 12 } } },
        { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '2 + 2' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' = 4.' } },
        { type: 'content_block_stop', index: 0 },
        { type: 'message_delta', usage: { output_tokens: 6 } },
        { type: 'message_stop' },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))

    const params: ChatParams = {
      messages: [{ role: 'user', content: 'What is 2 + 2?' }],
      maxTokens: 256,
    }
    let reply = ''
    for await (const event of requireProvider().chat(params)) {
      if (event.type === 'text') reply += event.content
      if (event.type === 'error') throw new Error(event.message)
    }

    expect(reply).toBe('2 + 2 = 4.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/v1\/messages$/)
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('sk-ant-test')
    expect(JSON.parse(init.body as string)).toMatchObject({
      max_tokens: 256,
      messages: [{ role: 'user', content: 'What is 2 + 2?' }],
    })
  })
})
