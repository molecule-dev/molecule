/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real `@molecule/api-ai`
 * core. Only the network is mocked: `fetch` returns a real Responses API
 * (`/v1/responses`) SSE stream — the endpoint used on OpenAI's own API.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TokenUsage } from '@molecule/api-ai'
import { requireProvider, setProvider } from '@molecule/api-ai'

import { createProvider } from '../index.js'

/**
 * Builds a Responses API streaming (SSE) response.
 *
 * @param events - The Responses stream events, in order.
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

  it('bonds OpenAI by name and streams the reply through the core', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
    vi.stubEnv('OPENAI_BASE_URL', undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      sseResponse([
        { type: 'response.created', response: { id: 'resp_1', status: 'in_progress' } },
        { type: 'response.output_text.delta', item_id: 'msg_1', delta: '2 + 2' },
        { type: 'response.output_text.delta', item_id: 'msg_1', delta: ' = 4.' },
        {
          type: 'response.completed',
          response: {
            id: 'resp_1',
            status: 'completed',
            usage: { input_tokens: 14, output_tokens: 8 },
          },
        },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider('openai', createProvider({ apiKey: process.env.OPENAI_API_KEY }))

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
    expect(url).toBe('https://api.openai.com/v1/responses')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key')
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: 'gpt-6-luna',
      max_output_tokens: 256,
      stream: true,
      input: [{ role: 'user', content: 'What is 2 + 2?' }],
    })
  })
})
