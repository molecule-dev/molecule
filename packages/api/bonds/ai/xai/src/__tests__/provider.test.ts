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

describe('createProvider', () => {
  it('returns a provider with name "xai"', () => {
    const provider = createProvider({ apiKey: 'k' })
    expect(provider.name).toBe('xai')
  })

  it('falls back to XAI_API_KEY env var when no config', () => {
    const prev = process.env.XAI_API_KEY
    process.env.XAI_API_KEY = 'env-key'
    try {
      const provider = createProvider()
      expect(provider.name).toBe('xai')
    } finally {
      if (prev === undefined) delete process.env.XAI_API_KEY
      else process.env.XAI_API_KEY = prev
    }
  })
})

describe('chat() — request shape', () => {
  it('POSTs to baseUrl + /v1/chat/completions with Bearer auth', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'hi' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'grok-key', baseUrl: 'https://grok.test' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
    })) {
      // drain
    }

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://grok.test/v1/chat/completions')
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer grok-key')
    expect(headers['Content-Type']).toBe('application/json')
    expect((init as RequestInit).method).toBe('POST')
  })

  it('defaults baseUrl to https://api.x.ai', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'hi' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
    })) {
      // drain
    }
    expect(fetch.mock.calls[0][0]).toBe('https://api.x.ai/v1/chat/completions')
  })

  it('honours XAI_BASE_URL env var', async () => {
    const prev = process.env.XAI_BASE_URL
    process.env.XAI_BASE_URL = 'https://gateway.broker'
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
      if (prev === undefined) delete process.env.XAI_BASE_URL
      else process.env.XAI_BASE_URL = prev
    }
  })

  it('config.baseUrl takes precedence over XAI_BASE_URL env var', async () => {
    const prev = process.env.XAI_BASE_URL
    process.env.XAI_BASE_URL = 'https://env.broker'
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
      if (prev === undefined) delete process.env.XAI_BASE_URL
      else process.env.XAI_BASE_URL = prev
    }
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
      messages: [{ role: 'user', content: 'h' }],
      tools: [{ name: 'finalize', description: 'f', parameters: { type: 'object' } }],
      toolChoice,
      stream: false,
    })) {
      // drain
    }
    return JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
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

  it('includes system prompt as leading {role:system}', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'ok' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      system: 'you are helpful',
      stream: false,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.messages[0]).toEqual({ role: 'system', content: 'you are helpful' })
    expect(body.messages[1]).toEqual({ role: 'user', content: 'h' })
  })

  it('uses max_completion_tokens (not max_tokens)', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'ok' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      maxTokens: 1234,
      stream: false,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.max_completion_tokens).toBe(1234)
    expect(body.max_tokens).toBeUndefined()
  })

  it('defaults model to grok-code-fast-1', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'ok' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe('grok-code-fast-1')
  })

  it('passes caller-supplied model verbatim', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'ok' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      model: 'grok-4-special',
      stream: false,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe('grok-4-special')
  })

  it('adds stream_options.include_usage when streaming', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(sseResponse(['data: [DONE]']))

    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({ messages: [{ role: 'user', content: 'h' }] })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.stream).toBe(true)
    expect(body.stream_options).toEqual({ include_usage: true })
  })

  it('omits stream_options when not streaming', async () => {
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
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.stream).toBe(false)
    expect(body.stream_options).toBeUndefined()
  })

  it('formats tools as {type:function, function:{name, description, parameters}}', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'ok' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
      tools: [{ name: 'add', description: 'sum', parameters: { type: 'object' } }],
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.tools).toEqual([
      {
        type: 'function',
        function: { name: 'add', description: 'sum', parameters: { type: 'object' } },
      },
    ])
  })

  it('passes temperature when supplied (and no thinking)', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
      temperature: 0.42,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.temperature).toBe(0.42)
    expect(body.reasoning_effort).toBeUndefined()
  })

  describe('thinking → reasoning_effort mapping', () => {
    it('budgetTokens >= 8000 → "high"', async () => {
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockResolvedValue(
        jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
      )

      const provider = createProvider({ apiKey: 'k' })
      for await (const _ of provider.chat({
        messages: [{ role: 'user', content: 'h' }],
        stream: false,
        thinking: { type: 'enabled', budgetTokens: 8000 },
      })) {
        // drain
      }
      const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
      expect(body.reasoning_effort).toBe('high')
    })

    it('budgetTokens < 8000 → "low"', async () => {
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockResolvedValue(
        jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
      )

      const provider = createProvider({ apiKey: 'k' })
      for await (const _ of provider.chat({
        messages: [{ role: 'user', content: 'h' }],
        stream: false,
        thinking: { type: 'enabled', budgetTokens: 1000 },
      })) {
        // drain
      }
      const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
      expect(body.reasoning_effort).toBe('low')
    })

    it('thinking suppresses temperature (mutually exclusive in xAI API)', async () => {
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockResolvedValue(
        jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
      )

      const provider = createProvider({ apiKey: 'k' })
      for await (const _ of provider.chat({
        messages: [{ role: 'user', content: 'h' }],
        stream: false,
        thinking: { type: 'enabled', budgetTokens: 5000 },
        temperature: 0.9,
      })) {
        // drain
      }
      const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
      expect(body.reasoning_effort).toBe('low')
      expect(body.temperature).toBeUndefined()
    })
  })
})

describe('chat() — non-streaming response parsing', () => {
  it('emits text + done with token counts from usage', async () => {
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
        // prompt_tokens is the TOTAL (cached + uncached); 8 of 10 were cached.
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

  it('emits thinking before text when reasoning_content present', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, {
        choices: [{ message: { reasoning_content: 'pondering...', content: 'Final answer' } }],
        usage: {},
      }),
    )

    const provider = createProvider({ apiKey: 'k' })
    const events: { type: string; content?: string }[] = []
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      stream: false,
    })) {
      events.push(e as { type: string; content?: string })
    }
    expect(events.map((e) => e.type)).toEqual(['thinking', 'text', 'done'])
    expect(events[0].content).toBe('pondering...')
    expect(events[1].content).toBe('Final answer')
  })

  it('emits tool_use with parsed JSON arguments', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, {
        choices: [
          {
            message: {
              tool_calls: [
                { id: 'call_abc', function: { name: 'add', arguments: '{"a":1,"b":2}' } },
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
  function expectError(events: unknown[], pattern: RegExp) {
    const err = events.find((e) => (e as { type: string }).type === 'error') as { message: string }
    expect(err).toBeDefined()
    expect(err.message).toMatch(pattern)
  }

  it('429 → "rate limit" client message (after retries exhausted)', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(429, { error: { message: 'too many' } }))

    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      stream: false,
      signal: AbortSignal.timeout(1),
    })) {
      events.push(e)
    }
    expectError(events, /rate limit/i)
  })

  it('401 → "configuration error" (does NOT leak upstream message containing API key)', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(401, { error: { message: 'Invalid API key xai-secret-1234' } }),
    )

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
    expect(err.message).not.toContain('xai-secret-1234')
  })

  it('400 + "context length" detail → "Conversation too long"', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(400, { error: { message: 'maximum context length exceeded' } }),
    )

    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'x' }],
      stream: false,
    })) {
      events.push(e)
    }
    expectError(events, /Conversation too long/i)
  })

  it('503 → "temporarily overloaded" (after retries exhausted)', async () => {
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

  it('500 → generic "service error"', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(500, { error: { message: 'oops' } }))

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

describe('chat() — streaming SSE parsing', () => {
  it('emits text events from delta.content lines', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: ' + JSON.stringify({ choices: [{ delta: { content: 'Hel' } }] }),
        'data: ' + JSON.stringify({ choices: [{ delta: { content: 'lo' } }] }),
        'data: [DONE]',
      ]),
    )

    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({ messages: [{ role: 'user', content: 'h' }] })) {
      events.push(e)
    }
    const texts = events.filter((e) => (e as { type: string }).type === 'text')
    expect(texts).toEqual([
      { type: 'text', content: 'Hel' },
      { type: 'text', content: 'lo' },
    ])
  })

  it('skips malformed JSON data: lines silently', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: not-json',
        'data: ' + JSON.stringify({ choices: [{ delta: { content: 'recovered' } }] }),
        'data: [DONE]',
      ]),
    )

    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({ messages: [{ role: 'user', content: 'h' }] })) {
      events.push(e)
    }
    const text = events.find((e) => (e as { type: string }).type === 'text')
    expect(text).toEqual({ type: 'text', content: 'recovered' })
  })

  it('aggregates tool_calls arguments across multiple deltas', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: ' +
          JSON.stringify({
            choices: [
              {
                delta: {
                  tool_calls: [
                    { index: 0, id: 'call_x', function: { name: 'compute', arguments: '{"a":' } },
                  ],
                },
              },
            ],
          }),
        'data: ' +
          JSON.stringify({
            choices: [
              {
                delta: {
                  tool_calls: [{ index: 0, function: { arguments: '1,"b":2}' } }],
                },
                finish_reason: 'tool_calls',
              },
            ],
          }),
        'data: [DONE]',
      ]),
    )

    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({ messages: [{ role: 'user', content: 'h' }] })) {
      events.push(e)
    }
    const tool = events.find((e) => (e as { type: string }).type === 'tool_use') as {
      type: string
      id: string
      name: string
      input: unknown
    }
    expect(tool).toMatchObject({
      type: 'tool_use',
      id: 'call_x',
      name: 'compute',
      input: { a: 1, b: 2 },
    })
  })

  it('emits tool_use_start then tool_input_delta chunks before the final tool_use', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: ' +
          JSON.stringify({
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: 'call_x',
                      function: { name: 'write_file', arguments: '{"path":' },
                    },
                  ],
                },
              },
            ],
          }),
        'data: ' +
          JSON.stringify({
            choices: [
              {
                delta: { tool_calls: [{ index: 0, function: { arguments: '"a.ts"}' } }] },
                finish_reason: 'tool_calls',
              },
            ],
          }),
        'data: [DONE]',
      ]),
    )

    const provider = createProvider({ apiKey: 'k' })
    const events: Array<{ type: string; id?: string; name?: string; chars?: number }> = []
    for await (const e of provider.chat({ messages: [{ role: 'user', content: 'h' }] })) {
      events.push(e as { type: string })
    }

    // Start surfaces immediately with id + name, before the arguments stream.
    expect(events.find((e) => e.type === 'tool_use_start')).toMatchObject({
      type: 'tool_use_start',
      id: 'call_x',
      name: 'write_file',
    })
    // Each argument chunk streams as a tool_input_delta carrying real progress —
    // a char count, not the content. The counts sum to the full input length.
    const deltas = events.filter((e) => e.type === 'tool_input_delta')
    expect(deltas.reduce((sum, d) => sum + (d.chars ?? 0), 0)).toBe('{"path":"a.ts"}'.length)
    // The final tool_use carries the fully-parsed input.
    expect(events.find((e) => e.type === 'tool_use')).toMatchObject({
      type: 'tool_use',
      id: 'call_x',
      name: 'write_file',
      input: { path: 'a.ts' },
    })
    // Ordering: start → deltas → final tool_use.
    const iStart = events.findIndex((e) => e.type === 'tool_use_start')
    const iDelta = events.findIndex((e) => e.type === 'tool_input_delta')
    const iUse = events.findIndex((e) => e.type === 'tool_use')
    expect(iStart).toBeLessThan(iDelta)
    expect(iDelta).toBeLessThan(iUse)
  })

  it('extracts usage info from final chunk and emits done with token counts', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: ' + JSON.stringify({ choices: [{ delta: { content: 'hi' } }] }),
        'data: ' +
          JSON.stringify({ usage: { prompt_tokens: 7, completion_tokens: 1 }, choices: [] }),
        'data: [DONE]',
      ]),
    )

    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({ messages: [{ role: 'user', content: 'h' }] })) {
      events.push(e)
    }
    const done = events.find((e) => (e as { type: string }).type === 'done') as {
      type: string
      usage: { inputTokens: number; outputTokens: number; cacheReadInputTokens?: number }
    }
    expect(done.usage).toEqual({ inputTokens: 7, outputTokens: 1, cacheReadInputTokens: 0 })
  })

  it('emits thinking events from delta.reasoning_content', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: ' + JSON.stringify({ choices: [{ delta: { reasoning_content: 'step 1' } }] }),
        'data: ' + JSON.stringify({ choices: [{ delta: { content: 'answer' } }] }),
        'data: [DONE]',
      ]),
    )

    const provider = createProvider({ apiKey: 'k' })
    const events: { type: string; content?: string }[] = []
    for await (const e of provider.chat({ messages: [{ role: 'user', content: 'h' }] })) {
      events.push(e as { type: string; content?: string })
    }
    expect(events.find((e) => e.type === 'thinking')).toEqual({
      type: 'thinking',
      content: 'step 1',
    })
  })
})
