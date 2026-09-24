/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real `@molecule/api-ai`
 * core. Only the network is mocked: `fetch` returns a real Gemini
 * `streamGenerateContent?alt=sse` stream.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TokenUsage } from '@molecule/api-ai'
import { requireProvider, setProvider } from '@molecule/api-ai'

import { createProvider } from '../index.js'

/**
 * Builds a Gemini streaming (SSE) response.
 *
 * @param chunks - The `GenerateContentResponse` payloads, in order.
 * @returns The fetch Response.
 */
function sseResponse(chunks: Array<Record<string, unknown>>): Response {
  const body = chunks.map((c) => `data: ${JSON.stringify(c)}\r\n\r\n`).join('')
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds Google by name and streams the reply through the core', async () => {
    vi.stubEnv('GOOGLE_AI_API_KEY', 'test-key')
    vi.stubEnv('GOOGLE_AI_BASE_URL', undefined)
    vi.stubEnv('GOOGLE_AI_MODEL', undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      sseResponse([
        { candidates: [{ content: { role: 'model', parts: [{ text: '2 + 2' }] } }] },
        {
          candidates: [
            { content: { role: 'model', parts: [{ text: ' = 4.' }] }, finishReason: 'STOP' },
          ],
          usageMetadata: { promptTokenCount: 14, candidatesTokenCount: 8, totalTokenCount: 22 },
        },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider('google', createProvider({ apiKey: process.env.GOOGLE_AI_API_KEY }))

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
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse&key=test-key',
    )
    expect(JSON.parse(init.body as string)).toMatchObject({
      contents: [{ role: 'user', parts: [{ text: 'What is 2 + 2?' }] }],
      generationConfig: { maxOutputTokens: 256 },
    })
  })
})
