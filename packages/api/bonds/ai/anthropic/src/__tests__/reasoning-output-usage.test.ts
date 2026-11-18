import { afterEach, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

it.each([true, false])('records Anthropic thinking token counts (stream=%s)', async (stream) => {
  const prompt = { input_tokens: 29, cache_read_input_tokens: 71 }
  const completion = { output_tokens: 19, output_tokens_details: { thinking_tokens: 9 } }
  const frames = [
    { type: 'message_start', message: { usage: { ...prompt, output_tokens: 0 } } },
    { type: 'message_delta', usage: completion },
    { type: 'message_stop' },
  ]
  vi.stubGlobal('fetch', async () =>
    stream
      ? new Response(frames.map((frame) => `data: ${JSON.stringify(frame)}\n\n`).join(''), {
          headers: { 'content-type': 'text/event-stream' },
        })
      : Response.json({
          content: [{ type: 'text', text: 'Answer' }],
          usage: { ...prompt, ...completion },
        }),
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
    outputTokens: 19,
    reasoningOutputTokens: 9,
  }
  expect(events.at(-1)).toMatchObject({ type: 'done', usage })
  if (stream) expect(events.findLast((event) => event.type === 'usage')?.usage).toEqual(usage)
})
