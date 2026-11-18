import { afterEach, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

it.each([true, false])(
  'includes Gemini thoughts in the output total (stream=%s)',
  async (stream) => {
    const prompt = { promptTokenCount: 100, cachedContentTokenCount: 71 }
    const response = {
      candidates: [
        { content: { role: 'model', parts: [{ text: 'Answer' }] }, finishReason: 'STOP' },
      ],
      usageMetadata: {
        ...prompt,
        candidatesTokenCount: 19,
        thoughtsTokenCount: 32,
        totalTokenCount: 151,
      },
    }
    const frames = [
      { usageMetadata: { ...prompt, thoughtsTokenCount: 32 } },
      { ...response, usageMetadata: { candidatesTokenCount: 19, totalTokenCount: 151 } },
    ]
    vi.stubGlobal('fetch', async () =>
      stream
        ? new Response(frames.map((frame) => `data: ${JSON.stringify(frame)}\n\n`).join(''), {
            headers: { 'content-type': 'text/event-stream' },
          })
        : Response.json(response),
    )

    const events = await Array.fromAsync(
      createProvider({ apiKey: 'fixture', baseUrl: 'https://provider.invalid' }).chat({
        messages: [{ role: 'user', content: 'Hello' }],
        stream,
      }),
    )

    const usage = {
      inputTokens: 29,
      cacheReadInputTokens: 71,
      outputTokens: 51,
      reasoningOutputTokens: 32,
      meteredOutputTokens: 19,
    }
    expect(events.at(-1)).toMatchObject({ type: 'done', usage })
    if (stream) expect(events.findLast((event) => event.type === 'usage')?.usage).toEqual(usage)
  },
)
