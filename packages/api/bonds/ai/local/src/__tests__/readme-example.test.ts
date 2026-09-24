/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real `@molecule/api-ai`
 * core. Only the network is mocked: `fetch` returns a real OpenAI-compatible
 * chat-completions SSE stream, as Ollama serves it.
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

  it('bonds the local provider by name and streams the reply through the core', async () => {
    vi.stubEnv('LOCAL_AI_BASE_URL', undefined)
    vi.stubEnv('LOCAL_AI_MODEL', undefined)
    vi.stubEnv('LOCAL_AI_API_KEY', undefined)
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

    setProvider(
      'local',
      createProvider({
        baseUrl: process.env.LOCAL_AI_BASE_URL ?? 'http://localhost:11434/v1',
        model: process.env.LOCAL_AI_MODEL ?? 'llama3.1',
      }),
    )

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
    expect(url).toBe('http://localhost:11434/v1/chat/completions')
    // Keyless: no Authorization header is sent.
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: 'llama3.1',
      max_tokens: 256,
      stream: true,
      messages: [{ role: 'user', content: 'What is 2 + 2?' }],
    })
  })
})
