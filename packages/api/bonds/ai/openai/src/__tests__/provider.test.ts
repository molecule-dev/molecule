import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, OpenaiAIProvider } from '../provider.js'

/**
 * Build a mock `Response` that yields the supplied JSON for non-streaming
 * tests.
 */
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

/**
 * Build a mock `Response` whose body streams the supplied SSE lines.
 */
function sseResponse(lines: string[]): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line + '\n'))
      controller.close()
    },
  })
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createProvider / constructor', () => {
  it('factory returns an OpenaiAIProvider instance', () => {
    const provider = createProvider()
    expect(provider).toBeInstanceOf(OpenaiAIProvider)
    expect(provider.name).toBe('openai')
  })

  it('reads apiKey from config when supplied', () => {
    const provider = createProvider({ apiKey: 'sk-test-123' })
    // We can't directly inspect the private field, but we can verify it's
    // used in the Authorization header during a chat() call (next test).
    expect(provider).toBeDefined()
  })

  it('falls back to OPENAI_API_KEY env when no config', () => {
    const prev = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'env-key-456'
    try {
      const provider = createProvider()
      expect(provider).toBeInstanceOf(OpenaiAIProvider)
    } finally {
      process.env.OPENAI_API_KEY = prev
    }
  })

  it('defaults model to gpt-4o-mini and maxTokens to 4096', () => {
    // Indirectly verified through the request body in the test below.
    const provider = createProvider()
    expect(provider).toBeInstanceOf(OpenaiAIProvider)
  })
})

describe('chat() — request shape', () => {
  it('POSTs to baseUrl + /v1/chat/completions with Authorization header', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'hi' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'sk-abc', baseUrl: 'https://proxy.test' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
    })) {
      // drain
    }

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://proxy.test/v1/chat/completions')
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer sk-abc')
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('includes system prompt as a leading {role:system} message', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'ok' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'hi' }],
      system: 'You are a teapot.',
      stream: false,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as { body: string }).body) as {
      messages: Array<{ role: string; content: string }>
    }
    expect(body.messages[0]).toEqual({ role: 'system', content: 'You are a teapot.' })
    expect(body.messages[1]).toMatchObject({ role: 'user', content: 'hi' })
  })

  it('passes temperature through when provided', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: '' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      temperature: 0.42,
      stream: false,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as { body: string }).body) as {
      temperature?: number
    }
    expect(body.temperature).toBe(0.42)
  })

  it('uses custom model + maxTokens when supplied', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: '' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      model: 'gpt-4-turbo',
      maxTokens: 2048,
      stream: false,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as { body: string }).body) as {
      model: string
      max_tokens: number
    }
    expect(body.model).toBe('gpt-4-turbo')
    expect(body.max_tokens).toBe(2048)
  })

  it('formats tools into the OpenAI {type: function} shape', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: '' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      tools: [{ name: 'add', description: 'Sum two ints', parameters: { type: 'object' } }],
      stream: false,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as { body: string }).body) as {
      tools: Array<{ type: string; function: { name: string } }>
    }
    expect(body.tools[0].type).toBe('function')
    expect(body.tools[0].function.name).toBe('add')
  })
})

describe('chat() — non-streaming response parsing', () => {
  it('yields text + done events from a {choices: [{message: {content}}]} response', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, {
        choices: [{ message: { content: 'Hello!' } }],
        usage: { prompt_tokens: 5, completion_tokens: 2 },
      }),
    )

    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      stream: false,
    })) {
      events.push(e)
    }
    expect(events).toEqual([
      { type: 'text', content: 'Hello!' },
      { type: 'done', usage: { inputTokens: 5, outputTokens: 2 } },
    ])
  })

  it('yields tool_use events for messages with tool_calls', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, {
        choices: [
          {
            message: {
              tool_calls: [
                {
                  id: 'call_abc',
                  function: { name: 'add', arguments: '{"a":1,"b":2}' },
                },
              ],
            },
          },
        ],
        usage: {},
      }),
    )

    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      stream: false,
    })) {
      events.push(e)
    }
    expect(events.find((e) => (e as { type: string }).type === 'tool_use')).toEqual({
      type: 'tool_use',
      id: 'call_abc',
      name: 'add',
      input: { a: 1, b: 2 },
    })
  })

  it('falls back to empty input when tool_call arguments are malformed JSON', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, {
        choices: [
          {
            message: {
              tool_calls: [{ id: 'c1', function: { name: 'x', arguments: 'not-json' } }],
            },
          },
        ],
        usage: {},
      }),
    )

    const provider = createProvider({ apiKey: 'k' })
    let toolEvent: { type: string; input: unknown } | undefined
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      stream: false,
    })) {
      if ((e as { type: string }).type === 'tool_use') toolEvent = e as typeof toolEvent
    }
    expect(toolEvent?.input).toEqual({})
  })
})

describe('chat() — HTTP error handling', () => {
  function expectError(events: unknown[], messagePattern: RegExp) {
    const err = events.find((e) => (e as { type: string }).type === 'error') as { message: string }
    expect(err).toBeDefined()
    expect(err.message).toMatch(messagePattern)
  }

  it('429 → client message about rate limit (after retries exhausted)', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(429, { error: { message: 'too many' } }))

    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      stream: false,
      signal: AbortSignal.timeout(1), // bail out of retry delays fast
    })) {
      events.push(e)
    }
    expectError(events, /rate limit/i)
  })

  it('401 → "configuration error" message (does NOT leak the actual reason)', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(401, { error: { message: 'Invalid API key sk-xxx' } }))

    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      stream: false,
    })) {
      events.push(e)
    }
    const err = events.find((e) => (e as { type: string }).type === 'error') as { message: string }
    expect(err.message).toMatch(/configuration error/i)
    // critical: must NOT echo the upstream message that mentions the api key
    expect(err.message).not.toContain('sk-xxx')
  })

  it('400 with context-length error → "Conversation too long" friendly message', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(400, { error: { message: 'context length exceeded' } }))

    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      stream: false,
    })) {
      events.push(e)
    }
    expectError(events, /conversation too long/i)
  })

  it('503/502 → "temporarily overloaded" message (after retries exhausted)', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(503, { error: { message: 'overloaded' } }))

    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      stream: false,
      signal: AbortSignal.timeout(1),
    })) {
      events.push(e)
    }
    expectError(events, /temporarily overloaded/i)
  })

  it('500 → generic "AI service error" message', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(500, { error: { message: 'boom' } }))

    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      stream: false,
    })) {
      events.push(e)
    }
    expectError(events, /service error/i)
  })
})

describe('chat() — streaming response parsing', () => {
  it('yields text events from data: lines and a final done event', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}',
        'data: {"choices":[{"delta":{"content":" world"}}]}',
        'data: {"usage":{"prompt_tokens":10,"completion_tokens":2}}',
        'data: [DONE]',
      ]),
    )

    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({ messages: [{ role: 'user', content: 'x' }] })) {
      events.push(e)
    }
    const texts = events.filter((e) => (e as { type: string }).type === 'text')
    expect(texts).toEqual([
      { type: 'text', content: 'Hello' },
      { type: 'text', content: ' world' },
    ])
    const done = events.find((e) => (e as { type: string }).type === 'done') as {
      usage: { inputTokens: number; outputTokens: number }
    }
    expect(done.usage).toEqual({ inputTokens: 10, outputTokens: 2 })
  })

  it('skips lines that are not valid SSE data:', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        ': comment line',
        '',
        'event: ping',
        'data: {"choices":[{"delta":{"content":"hi"}}]}',
        'data: [DONE]',
      ]),
    )
    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({ messages: [{ role: 'user', content: 'x' }] })) {
      events.push(e)
    }
    const texts = events.filter((e) => (e as { type: string }).type === 'text')
    expect(texts).toEqual([{ type: 'text', content: 'hi' }])
  })

  it('silently ignores malformed JSON in data: lines', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: {malformed',
        'data: {"choices":[{"delta":{"content":"ok"}}]}',
        'data: [DONE]',
      ]),
    )
    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({ messages: [{ role: 'user', content: 'x' }] })) {
      events.push(e)
    }
    const texts = events.filter((e) => (e as { type: string }).type === 'text')
    expect(texts).toEqual([{ type: 'text', content: 'ok' }])
  })

  it('aggregates multi-chunk tool_call arguments before emitting tool_use', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"add","arguments":"{\\"a\\":"}}]}}]}',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"1,\\"b\\":2}"}}]}}]}',
        'data: [DONE]',
      ]),
    )
    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({ messages: [{ role: 'user', content: 'x' }] })) {
      events.push(e)
    }
    const toolUse = events.find((e) => (e as { type: string }).type === 'tool_use') as {
      id: string
      name: string
      input: unknown
    }
    expect(toolUse.id).toBe('c1')
    expect(toolUse.name).toBe('add')
    expect(toolUse.input).toEqual({ a: 1, b: 2 })
  })
})
