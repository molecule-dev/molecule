import { afterEach, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

const cachedUsage = {
  prompt_tokens: 100,
  completion_tokens: 19,
  prompt_tokens_details: { cached_tokens: 71 },
}

it.each([true, false])('records reasoning in Chat Completions (stream=%s)', async (stream) => {
  const usage = {
    ...cachedUsage,
    completion_tokens_details: { reasoning_tokens: 32 },
  }
  const complete = { finish_reason: 'stop' }
  const message = { content: 'Answer', reasoning_content: 'Thinking' }
  const response = stream
    ? new Response(
        [
          { choices: [{ delta: message, finish_reason: null }], usage: null },
          { choices: [], usage },
          'DONE',
        ]
          .map((chunk) => `data: ${chunk === 'DONE' ? '[DONE]' : JSON.stringify(chunk)}\n\n`)
          .join(''),
        { headers: { 'content-type': 'text/event-stream' } },
      )
    : Response.json({ choices: [{ message, ...complete }], usage })
  const fetch = vi.fn(async () => response)
  vi.stubGlobal('fetch', fetch)

  const provider = createProvider({ apiKey: 'fixture', baseUrl: 'https://provider.invalid' })
  const events = await Array.fromAsync(
    provider.chat({ messages: [{ role: 'user', content: 'Hello' }], stream }),
  )

  expect(events.at(-1)).toMatchObject({
    type: 'done',
    usage: {
      inputTokens: 29,
      cacheReadInputTokens: 71,
      outputTokens: 51,
      reasoningOutputTokens: 32,
      meteredOutputTokens: 19,
    },
  })
})
