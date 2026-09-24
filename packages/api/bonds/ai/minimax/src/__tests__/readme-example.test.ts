/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real `@molecule/api-ai`
 * core. Only the network is mocked: `fetch` returns a real OpenAI-compatible
 * chat-completions SSE stream.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TokenUsage } from '@molecule/api-ai'
import { requireProvider, setProvider } from '@molecule/api-ai'

import { createProvider } from '../index.js'

/**
 * Builds an OpenAI-compatible chat-completions streaming (SSE) response.
 *
 * @param chunks - The `chat.completion.chunk` payloads, in order.
 * @returns The fetch Response.
 */
function sseResponse(chunks: Array<Record<string, unknown>>): Response {
  const body = [...chunks.map((c) => JSON.stringify(c)), '[DONE]']
    .map((data) => `data: ${data}\n\n`)
    .join('')
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds MiniMax by name and streams the reply through the core', async () => {
    vi.stubEnv('MINIMAX_API_KEY', 'test-key')
    vi.stubEnv('MINIMAX_BASE_URL', undefined)
    vi.stubEnv('MINIMAX_COMPLETIONS_PATH', undefined)
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        sseResponse([
          { choices: [{ index: 0, delta: { role: 'assistant', content: '2 + 2' } }] },
          { choices: [{ index: 0, delta: { content: ' = 4.' } }] },
          { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
          { choices: [], usage: { prompt_tokens: 14, completion_tokens: 8, total_tokens: 22 } },
        ]),
      )
    vi.stubGlobal('fetch', fetchMock)

    setProvider('minimax', createProvider({ apiKey: process.env.MINIMAX_API_KEY }))

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
    expect(url).toBe('https://api.minimax.io/v1/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key')
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: 'minimax-m3',
      max_completion_tokens: 256,
      stream: true,
      messages: [{ role: 'user', content: 'What is 2 + 2?' }],
    })
  })
})
