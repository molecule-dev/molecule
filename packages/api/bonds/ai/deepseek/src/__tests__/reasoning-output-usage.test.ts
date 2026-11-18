import { afterEach, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

const cachedUsage = {
  prompt_tokens: 100,
  completion_tokens: 19,
  prompt_cache_hit_tokens: 71,
  prompt_cache_miss_tokens: 29,
}

it.each([true, false])('records reasoning in Chat Completions (stream=%s)', async (stream) => {
  const usage = {
    ...cachedUsage,
    completion_tokens_details: { reasoning_tokens: 9 },
  }
  const complete = { finish_reason: 'stop' }
  const message = { content: 'Answer', reasoning_content: 'Thinking' }
  const response = stream
    ? new Response(
        [
          { choices: [{ delta: message, finish_reason: null }], usage: null },
          { choices: [{ delta: {}, ...complete }], usage },
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
      outputTokens: 19,
      reasoningOutputTokens: 9,
    },
  })
})

it.each([undefined, null, 0])('preserves an optional reasoning count (%s)', async (count) => {
  vi.stubGlobal('fetch', async () =>
    Response.json({
      choices: [
        { message: { content: 'Answer', reasoning_content: 'Thinking' }, finish_reason: 'stop' },
      ],
      usage: { ...cachedUsage, completion_tokens_details: { reasoning_tokens: count } },
    }),
  )
  const provider = createProvider({ apiKey: 'fixture', baseUrl: 'https://provider.invalid' })
  const events = await Array.fromAsync(
    provider.chat({ messages: [{ role: 'user', content: 'Hello' }], stream: false }),
  )
  const done = events.find((event) => event.type === 'done')
  expect(done).toBeDefined()
  if (count === 0) expect(done?.usage.reasoningOutputTokens).toBe(0)
  else expect(done?.usage).not.toHaveProperty('reasoningOutputTokens')
})

it('uses the latest reasoning snapshot and keeps it when a later frame omits it', async () => {
  const chunks = [
    { choices: [], usage: { completion_tokens_details: { reasoning_tokens: 4 } } },
    { choices: [], usage: { completion_tokens_details: { reasoning_tokens: 9 } } },
    { choices: [{ delta: {}, finish_reason: 'stop' }], usage: cachedUsage },
  ]
  vi.stubGlobal(
    'fetch',
    async () =>
      new Response(
        chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join('') + 'data: [DONE]\n\n',
        { headers: { 'content-type': 'text/event-stream' } },
      ),
  )

  const events = await Array.fromAsync(
    createProvider({ apiKey: 'fixture', baseUrl: 'https://provider.invalid' }).chat({
      messages: [{ role: 'user', content: 'Hello' }],
    }),
  )
  expect(events.at(-1)).toMatchObject({
    type: 'done',
    usage: { outputTokens: 19, reasoningOutputTokens: 9 },
  })
})
