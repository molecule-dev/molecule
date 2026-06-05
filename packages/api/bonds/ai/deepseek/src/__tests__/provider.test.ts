vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((_key: string, _values?: unknown, options?: { defaultValue?: string }) => {
    return options?.defaultValue ?? _key
  }),
}))

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatEvent } from '@molecule/api-ai'

import { createProvider } from '../provider.js'

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function sseResponse(lines: string[]): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line + '\n'))
      controller.close()
    },
  })
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

async function drain(iter: AsyncIterable<ChatEvent>): Promise<ChatEvent[]> {
  const events: ChatEvent[] = []
  for await (const e of iter) events.push(e)
  return events
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createProvider', () => {
  it('returns a provider with name "deepseek"', () => {
    expect(createProvider({ apiKey: 'k' }).name).toBe('deepseek')
  })

  it('falls back to DEEPSEEK_API_KEY env var when no config', () => {
    const prev = process.env.DEEPSEEK_API_KEY
    process.env.DEEPSEEK_API_KEY = 'env-key'
    try {
      expect(createProvider().name).toBe('deepseek')
    } finally {
      if (prev === undefined) delete process.env.DEEPSEEK_API_KEY
      else process.env.DEEPSEEK_API_KEY = prev
    }
  })
})

describe('chat() — request shape', () => {
  it('POSTs to baseUrl + /v1/chat/completions with Bearer auth', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(200, { choices: [{ message: { content: 'hi' } }] }))
    const provider = createProvider({ apiKey: 'ds-key', baseUrl: 'https://ds.test' })
    await drain(provider.chat({ messages: [{ role: 'user', content: 'hello' }], stream: false }))
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://ds.test/v1/chat/completions')
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer ds-key')
    expect((init as RequestInit).method).toBe('POST')
    const body = JSON.parse((init as RequestInit).body as string)
    // DeepSeek uses max_tokens (not max_completion_tokens) and V4 defaults thinking
    // ON, so a non-thinking request must explicitly disable it.
    expect(body.max_tokens).toBeGreaterThan(0)
    expect(body.max_completion_tokens).toBeUndefined()
    expect(body.thinking).toEqual({ type: 'disabled' })
  })

  it('defaults baseUrl to https://api.deepseek.com', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(200, { choices: [{ message: { content: 'x' } }] }))
    await drain(
      createProvider({ apiKey: 'k' }).chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
      }),
    )
    expect(fetch.mock.calls[0][0]).toBe('https://api.deepseek.com/v1/chat/completions')
  })

  it('honours DEEPSEEK_BASE_URL env var', async () => {
    const prev = process.env.DEEPSEEK_BASE_URL
    process.env.DEEPSEEK_BASE_URL = 'https://gateway.broker'
    try {
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockResolvedValue(jsonResponse(200, { choices: [{ message: { content: 'x' } }] }))
      await drain(
        createProvider({ apiKey: 'k' }).chat({
          messages: [{ role: 'user', content: 'hi' }],
          stream: false,
        }),
      )
      expect(fetch.mock.calls[0][0]).toBe('https://gateway.broker/v1/chat/completions')
    } finally {
      if (prev === undefined) delete process.env.DEEPSEEK_BASE_URL
      else process.env.DEEPSEEK_BASE_URL = prev
    }
  })

  it('sends tools in OpenAI function format and enables thinking with reasoning_effort max for a large budget', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(200, { choices: [{ message: { content: 'x' } }] }))
    await drain(
      createProvider({ apiKey: 'k' }).chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
        tools: [{ name: 'read_file', description: 'read', parameters: { type: 'object' } }],
        thinking: { budgetTokens: 13_000 },
      }),
    )
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.tools[0]).toEqual({
      type: 'function',
      function: { name: 'read_file', description: 'read', parameters: { type: 'object' } },
    })
    expect(body.thinking).toEqual({ type: 'enabled' })
    expect(body.reasoning_effort).toBe('max') // 13k >= 12k → max (V4 accepts high|max)
  })

  it('maps a small thinking budget to reasoning_effort high', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(200, { choices: [{ message: { content: 'x' } }] }))
    await drain(
      createProvider({ apiKey: 'k' }).chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
        thinking: { budgetTokens: 1_000 },
      }),
    )
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.reasoning_effort).toBe('high')
  })
})

describe('chat() — streaming', () => {
  it('parses text deltas, tool calls, and usage (with cached tokens)', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Hel"}}]}',
        'data: {"choices":[{"delta":{"content":"lo"}}]}',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"t1","function":{"name":"write_file","arguments":"{\\"path\\":\\"a.ts\\"}"}}]}}]}',
        'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}',
        'data: {"choices":[],"usage":{"prompt_tokens":100,"completion_tokens":20,"prompt_tokens_details":{"cached_tokens":40}}}',
        'data: [DONE]',
      ]),
    )
    const events = await drain(
      createProvider({ apiKey: 'k' }).chat({ messages: [{ role: 'user', content: 'go' }] }),
    )
    const text = events
      .filter((e) => e.type === 'text')
      .map((e) => (e as { content: string }).content)
      .join('')
    expect(text).toBe('Hello')
    const toolUse = events.find((e) => e.type === 'tool_use') as
      | { name: string; input: { path: string } }
      | undefined
    expect(toolUse?.name).toBe('write_file')
    expect(toolUse?.input.path).toBe('a.ts')
    const done = events.find((e) => e.type === 'done') as
      | { usage: { inputTokens: number; outputTokens: number; cacheReadInputTokens: number } }
      | undefined
    // 100 prompt - 40 cached = 60 uncached input; cached reported separately.
    expect(done?.usage).toMatchObject({
      inputTokens: 60,
      outputTokens: 20,
      cacheReadInputTokens: 40,
    })
  })
})

describe('chat() — errors', () => {
  it('yields an error event on a non-ok response', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(401, { error: { message: 'bad key' } }))
    const events = await drain(
      createProvider({ apiKey: 'k' }).chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
      }),
    )
    expect(events.some((e) => e.type === 'error')).toBe(true)
  })
})
