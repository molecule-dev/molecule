import { afterEach, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

/**
 * Every event a chat stream yields, in order.
 *
 * @param stream - The provider's chat stream.
 * @returns The events.
 */
async function collect<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const events: T[] = []
  for await (const event of stream) events.push(event)
  return events
}

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

    const events = await collect(
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
    if (stream)
      expect(events.filter((event) => event.type === 'usage').at(-1)?.usage).toEqual(usage)
  },
)
