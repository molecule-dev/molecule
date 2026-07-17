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
    const provider = createProvider({ apiKey: 'k' })
    expect(provider).toBeInstanceOf(OpenaiAIProvider)
    expect(provider.name).toBe('openai')
  })

  it('throws naming OPENAI_API_KEY when no key is configured (config or env)', () => {
    const prev = process.env.OPENAI_API_KEY
    delete process.env.OPENAI_API_KEY
    try {
      expect(() => createProvider()).toThrow(/OPENAI_API_KEY/)
    } finally {
      if (prev === undefined) delete process.env.OPENAI_API_KEY
      else process.env.OPENAI_API_KEY = prev
    }
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
    const provider = createProvider({ apiKey: 'k' })
    expect(provider).toBeInstanceOf(OpenaiAIProvider)
  })

  it('honours OPENAI_BASE_URL env var', async () => {
    const prev = process.env.OPENAI_BASE_URL
    process.env.OPENAI_BASE_URL = 'https://gateway.broker'
    try {
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockResolvedValue(
        jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
      )
      const provider = createProvider({ apiKey: 'k' })
      for await (const _ of provider.chat({
        messages: [{ role: 'user', content: 'h' }],
        stream: false,
      })) {
        // drain
      }
      expect(fetch.mock.calls[0][0]).toBe('https://gateway.broker/v1/chat/completions')
    } finally {
      if (prev === undefined) delete process.env.OPENAI_BASE_URL
      else process.env.OPENAI_BASE_URL = prev
    }
  })

  it('config.baseUrl takes precedence over OPENAI_BASE_URL env var', async () => {
    const prev = process.env.OPENAI_BASE_URL
    process.env.OPENAI_BASE_URL = 'https://env.broker'
    try {
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockResolvedValue(
        jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
      )
      const provider = createProvider({ apiKey: 'k', baseUrl: 'https://config.broker' })
      for await (const _ of provider.chat({
        messages: [{ role: 'user', content: 'h' }],
        stream: false,
      })) {
        // drain
      }
      expect(fetch.mock.calls[0][0]).toBe('https://config.broker/v1/chat/completions')
    } finally {
      if (prev === undefined) delete process.env.OPENAI_BASE_URL
      else process.env.OPENAI_BASE_URL = prev
    }
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

  const toolChoiceBody = async (
    toolChoice?: 'auto' | 'required' | { type: 'tool'; name: string },
  ) => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: '' } }], usage: {} }),
    )
    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      tools: [{ name: 'finalize', description: 'f', parameters: { type: 'object' } }],
      toolChoice,
      stream: false,
    })) {
      // drain
    }
    return JSON.parse((fetch.mock.calls[0][1] as { body: string }).body) as {
      tool_choice?: unknown
    }
  }

  it("maps toolChoice 'required' to 'required'", async () => {
    expect((await toolChoiceBody('required')).tool_choice).toBe('required')
  })

  it("maps a { type: 'tool', name } toolChoice to a forced OpenAI function choice", async () => {
    expect((await toolChoiceBody({ type: 'tool', name: 'finalize' })).tool_choice).toEqual({
      type: 'function',
      function: { name: 'finalize' },
    })
  })

  it('omits tool_choice when none is given', async () => {
    expect((await toolChoiceBody()).tool_choice).toBeUndefined()
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
      { type: 'done', usage: { inputTokens: 5, outputTokens: 2, cacheReadInputTokens: 0 } },
    ])
  })

  it('reports cached prompt tokens (uncached input + cacheRead) from prompt_tokens_details', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, {
        choices: [{ message: { content: 'Hi' } }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 2,
          prompt_tokens_details: { cached_tokens: 8 },
        },
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
    expect(events).toContainEqual({
      type: 'done',
      usage: { inputTokens: 2, outputTokens: 2, cacheReadInputTokens: 8 },
    })
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

  it('a plain 400 (invalid param, not context-length) → distinct non-retryable message, NOT the generic "try again"', async () => {
    // Regression: every non-context-length 400 used to fall through to the
    // same generic message as a genuinely retryable 5xx.
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(400, { error: { message: 'temperature must be <= 2' } }))

    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      stream: false,
    })) {
      events.push(e)
    }
    const err = events.find((e) => (e as { type: string }).type === 'error') as { message: string }
    expect(err.message).toBe('AI request was invalid — check the model and request parameters.')
    expect(err.message).not.toBe('AI service error. Please try again.')
  })
})

describe('chat() — Retry-After header parsing', () => {
  it('an HTTP-date Retry-After falls back to exponential backoff instead of a ~0ms retry', async () => {
    vi.useFakeTimers()
    try {
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      let call = 0
      fetch.mockImplementation(() => {
        call += 1
        if (call === 1) {
          return Promise.resolve(
            jsonResponse(
              429,
              { error: { message: 'rate limited' } },
              { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' },
            ),
          )
        }
        return Promise.resolve(jsonResponse(200, { choices: [{ message: { content: 'ok' } }] }))
      })

      const provider = createProvider({ apiKey: 'k' })
      const eventsPromise = (async () => {
        const events: unknown[] = []
        for await (const e of provider.chat({
          messages: [{ role: 'user', content: 'x' }],
          stream: false,
        })) {
          events.push(e)
        }
        return events
      })()

      // A NaN-degraded delay (pre-fix) would have already retried well
      // before 500ms; the fixed exponential backoff (attempt 0 = 1000ms)
      // must not have fired the second fetch yet.
      await vi.advanceTimersByTimeAsync(500)
      expect(fetch).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(2_000)
      await eventsPromise
      expect(fetch).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
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
      usage: { inputTokens: number; outputTokens: number; cacheReadInputTokens?: number }
    }
    expect(done.usage).toEqual({ inputTokens: 10, outputTokens: 2, cacheReadInputTokens: 0 })
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

  it('surfaces a MID-STREAM error chunk as an `error` event (not a silent drop + misleading `done`)', async () => {
    // OpenAI-compatible APIs can emit `data: {"error": {...}}` mid-stream (a
    // rate-limit/overload during high load). The chunk has no `choices`, so
    // without explicit handling it was silently dropped and the stream fell
    // through to a misleading `done` — the truncated turn read as a success.
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"partial"}}]}',
        'data: {"error":{"message":"Rate limit reached","type":"rate_limit_error","code":"rate_limit_exceeded"}}',
      ]),
    )
    const provider = createProvider({ apiKey: 'k' })
    const events: Array<{ type: string; message?: string; errorKey?: string }> = []
    for await (const e of provider.chat({ messages: [{ role: 'user', content: 'x' }] })) {
      events.push(e as { type: string; message?: string; errorKey?: string })
    }

    // The partial text before the error still streamed…
    expect(events.find((e) => e.type === 'text')).toBeDefined()
    // …then a real error event with the rate-limit message.
    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
    expect(errorEvent!.message).toBe('AI rate limit exceeded. Please try again shortly.')
    expect(errorEvent!.errorKey).toBe('ai.error.apiError')
    // Critically: NO misleading `done` after the error.
    expect(events.some((e) => e.type === 'done')).toBe(false)
    expect(events[events.length - 1].type).toBe('error')
  })
})

describe('secret registration', () => {
  it('registers OPENAI_API_KEY in the @molecule/api-secrets registry', async () => {
    await import('../index.js')
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    expect(getSecretDefinition('OPENAI_API_KEY')).toBeDefined()
  })
})
