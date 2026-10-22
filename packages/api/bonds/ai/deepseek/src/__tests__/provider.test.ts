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

function sseResponse(lines: string[], headers: Record<string, string> = {}): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line + '\n'))
      controller.close()
    },
  })
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/event-stream', ...headers },
  })
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

  it('throws naming DEEPSEEK_API_KEY when no key is configured (config or env)', () => {
    const prev = process.env.DEEPSEEK_API_KEY
    delete process.env.DEEPSEEK_API_KEY
    try {
      expect(() => createProvider()).toThrow(/DEEPSEEK_API_KEY/)
    } finally {
      if (prev === undefined) delete process.env.DEEPSEEK_API_KEY
      else process.env.DEEPSEEK_API_KEY = prev
    }
  })
})

describe('chat() — request shape', () => {
  it('POSTs to baseUrl + /v1/chat/completions with Bearer auth', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'hi' }, finish_reason: 'stop' }] }),
    )
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
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'x' }, finish_reason: 'stop' }] }),
    )
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
      fetch.mockResolvedValue(
        jsonResponse(200, { choices: [{ message: { content: 'x' }, finish_reason: 'stop' }] }),
      )
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
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'x' }, finish_reason: 'stop' }] }),
    )
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

  const stopBody = async (stop?: string[]) => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'x' }, finish_reason: 'stop' }] }),
    )
    await drain(
      createProvider({ apiKey: 'k' }).chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
        stop,
      }),
    )
    return JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
  }

  it('sends the caller’s stop sequences as `stop`', async () => {
    expect((await stopBody(['<analysis>'])).stop).toEqual(['<analysis>'])
  })

  it('sends no `stop` field when the caller asks for none', async () => {
    expect('stop' in (await stopBody())).toBe(false)
    expect('stop' in (await stopBody([]))).toBe(false)
  })

  it('caps the list at the API’s 16 sequences', async () => {
    const body = await stopBody(Array.from({ length: 18 }, (_, i) => `s${i}`))
    expect(body.stop).toHaveLength(16)
    expect(body.stop[0]).toBe('s0')
  })

  it('maps a small thinking budget to reasoning_effort high', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'x' }, finish_reason: 'stop' }] }),
    )
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

  // Abuse attribution. This bond serves the FREE tier, so it is the key most
  // exposed to anonymous abuse — without `user`, DeepSeek sees one org doing all
  // of it and the only lever they have is the key everyone shares.
  const endUserBody = async (endUserId?: string) => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'x' }, finish_reason: 'stop' }] }),
    )
    await drain(
      createProvider({ apiKey: 'k' }).chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
        endUserId,
      }),
    )
    return JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
  }

  it('forwards endUserId as the OpenAI-compatible `user` field', async () => {
    expect((await endUserBody('mol_9f2c1ab4')).user).toBe('mol_9f2c1ab4')
  })

  it('omits `user` when no id is supplied', async () => {
    expect('user' in (await endUserBody())).toBe(false)
  })

  const toolChoiceBody = async (
    toolChoice?: 'auto' | 'required' | { type: 'tool'; name: string },
  ) => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'x' }, finish_reason: 'stop' }] }),
    )
    await drain(
      createProvider({ apiKey: 'k' }).chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
        tools: [{ name: 'finalize', description: 'f', parameters: { type: 'object' } }],
        toolChoice,
      }),
    )
    return JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
  }

  it("maps toolChoice 'required' to 'required'", async () => {
    expect((await toolChoiceBody('required')).tool_choice).toBe('required')
  })

  it("maps a { type: 'tool', name } toolChoice to a forced OpenAI function choice", async () => {
    // Regression: forcing the exact tool is how starting-point selection guarantees
    // a finalize commit on its last turn instead of drifting back to exploration.
    expect((await toolChoiceBody({ type: 'tool', name: 'finalize' })).tool_choice).toEqual({
      type: 'function',
      function: { name: 'finalize' },
    })
  })

  it('omits tool_choice when none is given', async () => {
    expect((await toolChoiceBody()).tool_choice).toBeUndefined()
  })

  // DeepSeek 400s on a forced tool choice while thinking is on:
  // "Thinking mode does not support this tool_choice". The caller asks for
  // both; sending both kills the turn, so the nudge is relaxed and the quality
  // setting kept. `forceToolUse` fires in discovery mode — the FIRST turn of
  // every new conversation — so a 400 here would be maximally visible.
  const thinkingToolChoiceBody = async (
    toolChoice: 'required' | { type: 'tool'; name: string },
  ) => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'x' }, finish_reason: 'stop' }] }),
    )
    await drain(
      createProvider({ apiKey: 'k' }).chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
        tools: [{ name: 'finalize', description: 'f', parameters: { type: 'object' } }],
        toolChoice,
        thinking: { budgetTokens: 4096 },
      }),
    )
    return JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
  }

  it('relaxes a forced tool choice when thinking is enabled (DeepSeek rejects both)', async () => {
    const body = await thinkingToolChoiceBody('required')
    expect(body.tool_choice, 'no tool_choice is sent').toBeUndefined()
    expect(body.thinking, 'thinking is kept').toEqual({ type: 'enabled' })
    expect(body.tools, 'the tools themselves still go').toHaveLength(1)
  })

  it('relaxes a forced NAMED tool choice under thinking too', async () => {
    const body = await thinkingToolChoiceBody({ type: 'tool', name: 'finalize' })
    expect(body.tool_choice).toBeUndefined()
    expect(body.thinking).toEqual({ type: 'enabled' })
  })

  it('still forces the tool choice when thinking is OFF', async () => {
    const body = await toolChoiceBody('required')
    expect(body.tool_choice).toBe('required')
    expect(body.thinking).toEqual({ type: 'disabled' })
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
      { name: string; input: { path: string } } | undefined
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

  it('surfaces a mid-stream error chunk as an error event and does NOT emit a misleading done', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"partial"}}]}',
        'data: {"error":{"message":"Rate limit reached","type":"rate_limit_error","code":"rate_limit_exceeded"}}',
      ]),
    )
    const events = await drain(
      createProvider({ apiKey: 'k' }).chat({ messages: [{ role: 'user', content: 'go' }] }),
    )
    const text = events
      .filter((e) => e.type === 'text')
      .map((e) => (e as { content: string }).content)
      .join('')
    expect(text).toBe('partial')
    const err = events.find((e) => e.type === 'error') as
      { message: string; errorKey: string } | undefined
    expect(err).toBeDefined()
    expect(err?.message).toBe('AI rate limit exceeded. Please try again shortly.')
    expect(err?.errorKey).toBe('ai.error.apiError')
    // A truncated turn must NOT be reported as a successful completion.
    expect(events.some((e) => e.type === 'done')).toBe(false)
    expect(events[events.length - 1].type).toBe('error')
  })

  it('a mid-stream insufficient-balance chunk → the balance message, never transient', async () => {
    // A 200 SSE that turns into a billing error chunk: the account state must
    // survive the stream boundary instead of collapsing into the generic text.
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"partial"}}]}',
        'data: {"error":{"message":"Insufficient Balance (request_id: 5a5f2962)","type":"unknown_error","code":"invalid_request_error"}}',
      ]),
    )
    const events = await drain(
      createProvider({ apiKey: 'k' }).chat({ messages: [{ role: 'user', content: 'go' }] }),
    )
    const err = events.find((e) => e.type === 'error') as { message: string }
    expect(err.message).toBe('AI service is unavailable — provider credit balance too low.')
    expect(events.some((e) => e.type === 'done')).toBe(false)
  })

  it('a mid-stream 502 chunk → the overloaded message', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"partial"}}]}',
        'data: {"error":{"message":"502 Bad Gateway","code":"bad_gateway"}}',
      ]),
    )
    const events = await drain(
      createProvider({ apiKey: 'k' }).chat({ messages: [{ role: 'user', content: 'go' }] }),
    )
    const err = events.find((e) => e.type === 'error') as { message: string }
    expect(err.message).toBe('AI service is temporarily overloaded. Please try again in a moment.')
    expect(events.some((e) => e.type === 'done')).toBe(false)
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

  it('a plain 400 (invalid param, not context-length) → distinct non-retryable message', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(400, { error: { message: 'temperature must be <= 2' } }))
    const events = await drain(
      createProvider({ apiKey: 'k' }).chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
      }),
    )
    const err = events.find((e) => e.type === 'error') as { message: string }
    expect(err.message).toBe('AI request was invalid — check the model and request parameters.')
  })

  it('a 402 (exhausted provider account) → the balance message, never the generic "try again"', async () => {
    // The exact body a zero-balance DeepSeek account returns (2026-10-20): a
    // fast 402 whose `code` says "invalid_request_error" but is a billing state,
    // not a request problem — no retry can restore a negative balance.
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(402, {
        error: {
          message: 'Insufficient Balance (request_id: 5a5f2962)',
          type: 'unknown_error',
          code: 'invalid_request_error',
        },
      }),
    )
    const events = await drain(
      createProvider({ apiKey: 'k' }).chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
      }),
    )
    const err = events.find((e) => e.type === 'error') as { message: string }
    expect(err.message).toBe('AI service is unavailable — provider credit balance too low.')
  })

  it('a 400 whose detail names an exhausted account → the balance message, not "invalid request"', async () => {
    // Some OpenAI-compatible hosts report the same billing state on 400; the
    // account condition must win over the invalid-request reading.
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(400, { error: { message: 'Credit balance too low, top up your account' } }),
    )
    const events = await drain(
      createProvider({ apiKey: 'k' }).chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
      }),
    )
    const err = events.find((e) => e.type === 'error') as { message: string }
    expect(err.message).toBe('AI service is unavailable — provider credit balance too low.')
  })

  it.each([500, 502, 504])(
    'a %d from the provider rides the transient overloaded message (not a dead-end generic)',
    async (status) => {
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockResolvedValue(jsonResponse(status, { error: { message: 'upstream error' } }))
      const events = await drain(
        createProvider({ apiKey: 'k' }).chat({
          messages: [{ role: 'user', content: 'hi' }],
          stream: false,
        }),
      )
      const err = events.find((e) => e.type === 'error') as { message: string }
      expect(err.message).toBe(
        'AI service is temporarily overloaded. Please try again in a moment.',
      )
    },
  )

  it('a 503 keeps the overloaded message after the bond exhausts its own retries (known-good control)', async () => {
    vi.useFakeTimers()
    try {
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockResolvedValue(jsonResponse(503, { error: { message: 'Service Unavailable' } }))
      const eventsPromise = drain(
        createProvider({ apiKey: 'k' }).chat({
          messages: [{ role: 'user', content: 'hi' }],
          stream: false,
        }),
      )
      await vi.advanceTimersByTimeAsync(40_000)
      const events = await eventsPromise
      const err = events.find((e) => e.type === 'error') as { message: string }
      expect(err.message).toBe(
        'AI service is temporarily overloaded. Please try again in a moment.',
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('a 401 keeps the configuration message, carrying its status (known-good control)', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(401, { error: { message: 'Authentication Fails' } }))
    const events = await drain(
      createProvider({ apiKey: 'k' }).chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
      }),
    )
    const err = events.find((e) => e.type === 'error') as { message: string }
    expect(err.message).toBe(
      'AI service configuration error (HTTP 401) — the API key was rejected.',
    )
  })

  it('a 429 keeps the rate-limit message after the bond exhausts its own retries (known-good control)', async () => {
    vi.useFakeTimers()
    try {
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockResolvedValue(jsonResponse(429, { error: { message: 'rate limit reached' } }))
      const eventsPromise = drain(
        createProvider({ apiKey: 'k' }).chat({
          messages: [{ role: 'user', content: 'hi' }],
          stream: false,
        }),
      )
      await vi.advanceTimersByTimeAsync(40_000)
      const events = await eventsPromise
      const err = events.find((e) => e.type === 'error') as { message: string }
      expect(err.message).toBe('AI rate limit exceeded. Please try again shortly.')
    } finally {
      vi.useRealTimers()
    }
  })

  it('a context-length 400 keeps the too-long message (known-good control)', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(400, { error: { message: 'This model supports at most 65536 context length' } }),
    )
    const events = await drain(
      createProvider({ apiKey: 'k' }).chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
      }),
    )
    const err = events.find((e) => e.type === 'error') as { message: string }
    expect(err.message).toBe(
      "Conversation too long for the model's context window. Use /compact to free space, or start a new conversation.",
    )
  })

  it('any other status carries its HTTP status instead of a bare "try again" (403 control)', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(403, { error: { message: 'key forbidden for this region' } }),
    )
    const events = await drain(
      createProvider({ apiKey: 'k' }).chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
      }),
    )
    const err = events.find((e) => e.type === 'error') as { message: string }
    expect(err.message).toBe('AI service error (HTTP 403). Please try again.')
  })

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
        return Promise.resolve(
          jsonResponse(200, { choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }),
        )
      })

      const eventsPromise = drain(
        createProvider({ apiKey: 'k' }).chat({
          messages: [{ role: 'user', content: 'hi' }],
          stream: false,
        }),
      )

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

describe('secret registration', () => {
  it('registers DEEPSEEK_API_KEY in the @molecule/api-secrets registry', async () => {
    await import('../index.js')
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    expect(getSecretDefinition('DEEPSEEK_API_KEY')).toBeDefined()
  })
})

/**
 * An SSE response that delivers `lines` and then HANGS — the shape a stalled
 * upstream produces. The abort listener mirrors real `fetch`: aborting the
 * request's controller errors the body stream, which is what unblocks the
 * provider's pending `reader.read()` in production.
 */
function stallingSseResponse(signal: AbortSignal, lines: string[] = []): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line + '\n'))
      signal.addEventListener('abort', () => controller.error(new Error('aborted')))
    },
  })
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

/** One OpenAI-shaped content chunk. */
function sseText(content: string, completed = true): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: completed ? 'stop' : null }] })}`
}

describe('chat() — first-token stall', () => {
  it('abandons a stream that produces no content, retries once, and returns the retry reply', async () => {
    vi.useFakeTimers()
    try {
      const stalls: unknown[] = []
      let attempt = 0
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockImplementation((_url: string, init: RequestInit) => {
        attempt += 1
        return Promise.resolve(
          attempt === 1
            ? stallingSseResponse(init.signal as AbortSignal)
            : sseResponse([sseText('recovered')]),
        )
      })
      const provider = createProvider({
        apiKey: 'k',
        firstTokenTimeoutMs: 1_000,
        onStreamStall: (e) => stalls.push(e),
      })

      const eventsPromise = drain(provider.chat({ messages: [{ role: 'user', content: 'hi' }] }))
      await vi.advanceTimersByTimeAsync(1_100)
      const events = await eventsPromise

      expect(
        events.filter((e) => e.type === 'text').map((e) => (e as { content: string }).content),
      ).toEqual(['recovered'])
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(stalls).toEqual([
        {
          provider: 'deepseek',
          model: 'deepseek-flash',
          phase: 'before_content',
          stallMs: 1_000,
          attempt: 1,
          willRetry: true,
          streamedChars: 0,
          keepAlives: 0,
        },
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('treats a keep-alive drip as a stall: liveness frames are NOT content', async () => {
    vi.useFakeTimers()
    try {
      const stalls: { keepAlives: number; willRetry: boolean }[] = []
      let attempt = 0
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockImplementation((_url: string, init: RequestInit) => {
        attempt += 1
        return Promise.resolve(
          attempt === 1
            ? // Data IS arriving every second, and none of it is a reply — the
              // production shape a byte-level idle timeout cannot see.
              stallingSseResponse(init.signal as AbortSignal, [
                ': keep-alive',
                'data: {"choices":[]}',
              ])
            : sseResponse([sseText('ok')]),
        )
      })
      const provider = createProvider({
        apiKey: 'k',
        firstTokenTimeoutMs: 1_000,
        onStreamStall: (e) => stalls.push(e),
      })

      const eventsPromise = drain(provider.chat({ messages: [{ role: 'user', content: 'hi' }] }))
      await vi.advanceTimersByTimeAsync(1_100)
      await eventsPromise

      expect(stalls[0].keepAlives).toBeGreaterThan(0)
      expect(stalls[0].willRetry).toBe(true)
      expect(fetch).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not retry a stall that arrived AFTER content, and surfaces an error instead', async () => {
    vi.useFakeTimers()
    try {
      const stalls: { phase: string; streamedChars: number; willRetry: boolean }[] = []
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockImplementation((_url: string, init: RequestInit) =>
        Promise.resolve(
          stallingSseResponse(init.signal as AbortSignal, [sseText('half a rep', false)]),
        ),
      )
      const provider = createProvider({
        apiKey: 'k',
        firstTokenTimeoutMs: 1_000,
        // The reply starts, so the first-token window is replaced by the
        // inter-chunk silence window; the stream then goes quiet for good.
        streamSilenceTimeoutMs: 500,
        onStreamStall: (e) => stalls.push(e),
      })

      const eventsPromise = drain(provider.chat({ messages: [{ role: 'user', content: 'hi' }] }))
      await vi.advanceTimersByTimeAsync(1_100)
      const events = await eventsPromise

      // The partial reply is kept, the stall is recorded, and it is NOT retried
      // (a second attempt would duplicate the text already on the wire).
      expect(
        events.filter((e) => e.type === 'text').map((e) => (e as { content: string }).content),
      ).toEqual(['half a rep'])
      expect(events.some((e) => e.type === 'error')).toBe(true)
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(stalls).toEqual([
        {
          provider: 'deepseek',
          model: 'deepseek-flash',
          phase: 'after_content',
          stallMs: 500,
          attempt: 1,
          willRetry: false,
          streamedChars: 10,
          keepAlives: 0,
        },
      ])
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not treat a caller abort as a stall', async () => {
    vi.useFakeTimers()
    try {
      const stalls: unknown[] = []
      const abort = new AbortController()
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockImplementation((_url: string, init: RequestInit) =>
        Promise.resolve(stallingSseResponse(init.signal as AbortSignal)),
      )
      const provider = createProvider({
        apiKey: 'k',
        firstTokenTimeoutMs: 5_000,
        onStreamStall: (e) => stalls.push(e),
      })

      const eventsPromise = drain(
        provider.chat({ messages: [{ role: 'user', content: 'hi' }], signal: abort.signal }),
      )
      await vi.advanceTimersByTimeAsync(10)
      abort.abort()
      await expect(eventsPromise).rejects.toThrow()
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(stalls).toEqual([])
    } finally {
      vi.useRealTimers()
    }
  })

  it('gives up after one retry when the second attempt stalls too', async () => {
    vi.useFakeTimers()
    try {
      const stalls: { attempt: number; willRetry: boolean }[] = []
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockImplementation((_url: string, init: RequestInit) =>
        Promise.resolve(stallingSseResponse(init.signal as AbortSignal)),
      )
      const provider = createProvider({
        apiKey: 'k',
        firstTokenTimeoutMs: 1_000,
        onStreamStall: (e) => stalls.push(e),
      })

      const eventsPromise = drain(provider.chat({ messages: [{ role: 'user', content: 'hi' }] }))
      await vi.advanceTimersByTimeAsync(1_100)
      await vi.advanceTimersByTimeAsync(1_100)
      const events = await eventsPromise

      expect(fetch).toHaveBeenCalledTimes(2)
      expect(stalls.map((s) => [s.attempt, s.willRetry])).toEqual([
        [1, true],
        [2, false],
      ])
      expect(events.filter((e) => e.type === 'error')).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('leaves a stream that produces content alone (the bound is a stall bound)', async () => {
    vi.useFakeTimers()
    try {
      const stalls: unknown[] = []
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockResolvedValue(sseResponse([sseText('hello')]))
      const provider = createProvider({
        apiKey: 'k',
        firstTokenTimeoutMs: 1_000,
        onStreamStall: (e) => stalls.push(e),
      })

      const eventsPromise = drain(provider.chat({ messages: [{ role: 'user', content: 'hi' }] }))
      await vi.advanceTimersByTimeAsync(5_000)
      const events = await eventsPromise

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(stalls).toEqual([])
      expect(events.filter((e) => e.type === 'text')).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignores a bound that would abandon every stream on its first tick', async () => {
    // A non-positive bound arms `setTimeout` at once, and one past Node's 32-bit
    // timer ceiling is clamped to 1 ms — either would turn a stall bound into a
    // universal failure. Both must fall back to the default window instead.
    vi.useFakeTimers()
    try {
      const stalls: unknown[] = []
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockImplementation((_url: string, init: RequestInit) =>
        Promise.resolve(stallingSseResponse(init.signal as AbortSignal)),
      )
      const provider = createProvider({
        apiKey: 'k',
        firstTokenTimeoutMs: 0,
        onStreamStall: (e) => stalls.push(e),
      })

      const eventsPromise = drain(provider.chat({ messages: [{ role: 'user', content: 'hi' }] }))
      // Nothing fires early: the default 45 s window is in force, not a 0 ms one.
      await vi.advanceTimersByTimeAsync(40_000)
      expect(stalls).toEqual([])
      expect(fetch).toHaveBeenCalledTimes(1)
      // …and it does fire at the default window, so the value was replaced, not
      // disabled: the first attempt is abandoned at 45 s and asked again.
      await vi.advanceTimersByTimeAsync(6_000)
      expect(stalls).toHaveLength(1)
      expect((stalls[0] as { stallMs: number }).stallMs).toBe(45_000)
      // The retry stalls too, so the turn gets the error event.
      await vi.advanceTimersByTimeAsync(46_000)
      const events = await eventsPromise
      expect(stalls).toHaveLength(2)
      expect(events.filter((e) => e.type === 'error')).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('chat() — mixed tool-result + image message', () => {
  it('emits non-tool parts (a screenshot riding a tool result) instead of dropping them', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }),
    )
    const provider = createProvider({ apiKey: 'k' })
    await drain(
      provider.chat({
        stream: false,
        messages: [
          { role: 'user', content: 'shoot the page' },
          {
            role: 'assistant',
            content: [
              { type: 'text', text: 'taking the screenshot' },
              { type: 'tool_use', id: 'tc1', name: 'screenshot_preview', input: { path: '/' } },
            ],
          },
          {
            role: 'user',
            content: [
              { type: 'tool_result', tool_use_id: 'tc1', content: 'Screenshot saved.' },
              { type: 'image', mediaType: 'image/jpeg', data: 'QUJD' },
            ],
          },
        ],
      }),
    )
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    const toolMsg = body.messages.find(
      (m: { role: string; tool_call_id?: string }) => m.role === 'tool' && m.tool_call_id === 'tc1',
    )
    expect(toolMsg).toBeDefined()
    expect(toolMsg.content).toBe('Screenshot saved.')
    // The image part must arrive as its own user message AFTER the tool result —
    // not be silently dropped (the pre-2026-09-30 behavior).
    const imageMsg = body.messages.find(
      (m: { role: string; content?: unknown[] }) =>
        Array.isArray(m.content) && m.content.some((p) => p?.type === 'image_url'),
    )
    expect(imageMsg).toBeDefined()
    expect(imageMsg.role).toBe('user')
    expect(imageMsg.content[0].image_url.url).toBe('data:image/jpeg;base64,QUJD')
    const imageMsgIdx = body.messages.indexOf(imageMsg)
    expect(imageMsgIdx).toBeGreaterThan(body.messages.indexOf(toolMsg))
  })
})

// ---------------------------------------------------------------------------
// Per-call correlation — nailing a reply to the request that asked for it
// ---------------------------------------------------------------------------
//
// 2026-10-16 (x0 `xr-molecule-flash-m87`): a conversation was handed a complete,
// foreign completion — a Flutter/.NET ticket review — on a stream whose own
// usage matched that conversation's context exactly. The request was ours, the
// text was not, and nothing on the platform recorded WHICH upstream response it
// was, so neither we nor the vendor could trace it afterwards. These tests pin
// the two halves of the fix: the request carries an id we can name, and the
// reply reports the provider's own ids back on `done`.

/** One OpenAI-compatible SSE chunk with the provider's identity fields. */
function chunk(fields: Record<string, unknown> = {}): string {
  return `data: ${JSON.stringify({
    id: 'cmpl-abc',
    object: 'chat.completion.chunk',
    model: 'deepseek-flash',
    choices: [{ index: 0, delta: { content: 'hi' }, finish_reason: 'stop' }],
    usage: null,
    ...fields,
  })}`
}

describe('chat() — per-call correlation', () => {
  it('sends the caller’s request id on the wire and reports the provider’s ids on done', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([chunk(), 'data: [DONE]'], { 'x-ds-trace-id': 'trace-39191aaf' }),
    )
    const provider = createProvider({ apiKey: 'k' })
    const events = await drain(
      provider.chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: true,
        requestId: 'req-abc',
      }),
    )

    const headers = (fetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers['X-Mol-Request-Id']).toBe('req-abc')

    const done = events.find((e) => e.type === 'done') as
      { provider?: Record<string, string> } | undefined
    expect(done?.provider).toEqual({
      requestId: 'req-abc',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      traceId: 'trace-39191aaf',
      responseId: 'cmpl-abc',
      model: 'deepseek-flash',
    })
  })

  it('mints its own request id when the caller names none, so the call is still nameable', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(sseResponse([chunk(), 'data: [DONE]']))
    const provider = createProvider({ apiKey: 'k' })
    await drain(provider.chat({ messages: [{ role: 'user', content: 'hi' }], stream: true }))
    const headers = (fetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers['X-Mol-Request-Id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it('never folds the request id into the abuse-attribution `user` value', async () => {
    // `user` is stable per ACCOUNT — the provider scopes enforcement by it, so a
    // per-request value there would make one account look like thousands.
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(sseResponse([chunk(), 'data: [DONE]']))
    const provider = createProvider({ apiKey: 'k' })
    await drain(
      provider.chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: true,
        requestId: 'req-abc',
        endUserId: 'mol_0123456789abcdef0123456789abcdef',
      }),
    )
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.user).toBe('mol_0123456789abcdef0123456789abcdef')
  })

  it('treats an echoed identity that is not ours as an error instead of streaming somebody else’s text', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        chunk({ user: 'mol_someone_else', choices: [{ delta: { content: 'their answer' } }] }),
        'data: [DONE]',
      ]),
    )
    const provider = createProvider({ apiKey: 'k' })
    const events = await drain(
      provider.chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: true,
        requestId: 'req-abc',
        endUserId: 'mol_ours',
      }),
    )
    expect(events.some((e) => e.type === 'error')).toBe(true)
    expect(events.some((e) => e.type === 'text')).toBe(false)
  })

  it('accepts a reply that echoes the identity we sent', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(sseResponse([chunk({ user: 'mol_ours' }), 'data: [DONE]']))
    const provider = createProvider({ apiKey: 'k' })
    const events = await drain(
      provider.chat({
        messages: [{ role: 'user', content: 'hi' }],
        stream: true,
        requestId: 'req-abc',
        endUserId: 'mol_ours',
      }),
    )
    expect(events.some((e) => e.type === 'error')).toBe(false)
    expect(events.some((e) => e.type === 'text')).toBe(true)
  })
})

describe('chat() — explicit stream completion', () => {
  const toolChunk = (args: string) =>
    'data: ' +
    JSON.stringify({
      choices: [
        {
          delta: {
            tool_calls: [{ index: 0, id: 't1', function: { name: 'write_file', arguments: args } }],
          },
        },
      ],
    })
  const finish = (reason: string) =>
    'data: ' + JSON.stringify({ choices: [{ delta: {}, finish_reason: reason }] })

  it.each([
    ['empty EOF', []],
    ['partial text EOF', ['data: {"choices":[{"delta":{"content":"partial"}}]}']],
    ['DONE without a finish reason', ['data: [DONE]']],
    ['partial tool EOF', [toolChunk('{"path":"src/example.ts","content":"incomplete')]],
    ['valid tool JSON without a finish reason', [toolChunk('{"path":"a.ts"}')]],
    ['malformed SSE JSON', ['data: {broken', finish('stop')]],
    ['malformed tool JSON at tool_calls', [toolChunk('{"path":'), finish('tool_calls')]],
    ['non-object tool JSON', [toolChunk('null'), finish('tool_calls')]],
    [
      'mixed valid and malformed parallel tools',
      [
        toolChunk('{"path":"a.ts"}'),
        'data: ' +
          JSON.stringify({
            choices: [
              {
                delta: {
                  tool_calls: [
                    { index: 1, id: 't2', function: { name: 'write_file', arguments: '{bad' } },
                  ],
                },
              },
            ],
          }),
        finish('tool_calls'),
      ],
    ],
    ['tool finish without a tool', [finish('tool_calls')]],
    ['output token cap', [toolChunk('{"path":"a.ts"}'), finish('length'), 'data: [DONE]']],
    ['content filter', [finish('content_filter')]],
    ['resource interruption', [finish('insufficient_system_resource')]],
    ['upstream abort', [finish('aborted')]],
  ])('rejects %s without completing or dispatching a pending tool', async (_name, lines) => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(sseResponse(lines))
    const events = await drain(
      createProvider({ apiKey: 'k' }).chat({ messages: [{ role: 'user', content: 'go' }] }),
    )
    expect(events.filter((e) => e.type === 'error')).toHaveLength(1)
    expect(events.some((e) => e.type === 'done')).toBe(false)
    expect(events.some((e) => e.type === 'tool_use')).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(1)
    if (_name === 'partial text EOF')
      expect(events).toContainEqual({ type: 'text', content: 'partial' })
  })

  it.each(['stop', 'tool_calls'])(
    'completes valid tools with explicit %s, without needing DONE',
    async (reason) => {
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockResolvedValue(sseResponse([toolChunk('{"path":"a.ts"}'), finish(reason)]))
      const events = await drain(
        createProvider({ apiKey: 'k' }).chat({ messages: [{ role: 'user', content: 'go' }] }),
      )
      expect(events).toContainEqual({
        type: 'tool_use',
        id: 't1',
        name: 'write_file',
        input: { path: 'a.ts' },
      })
      expect(events.filter((e) => e.type === 'done')).toHaveLength(1)
      expect(events.some((e) => e.type === 'error')).toBe(false)
    },
  )

  it('retains partial text on a token cap, and completes normal text only with stop', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    for (const reason of ['length', 'stop']) {
      fetch.mockResolvedValue(
        sseResponse(['data: {"choices":[{"delta":{"content":"answer"}}]}', finish(reason)]),
      )
      const events = await drain(
        createProvider({ apiKey: 'k' }).chat({ messages: [{ role: 'user', content: 'go' }] }),
      )
      expect(events).toContainEqual({ type: 'text', content: 'answer' })
      expect(events.some((e) => e.type === 'done')).toBe(reason === 'stop')
      expect(events.some((e) => e.type === 'error')).toBe(reason === 'length')
    }
  })

  it('accepts an explicit stop chunk with no delta and a final usage-only chunk', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"answer"}}]}',
        'data: {"choices":[{"finish_reason":"stop"}]}',
        'data: {"choices":[],"usage":{"prompt_tokens":5,"completion_tokens":2}}',
      ]),
    )
    const events = await drain(
      createProvider({ apiKey: 'k' }).chat({ messages: [{ role: 'user', content: 'go' }] }),
    )
    expect(events.find((e) => e.type === 'done')).toMatchObject({
      usage: { inputTokens: 5, outputTokens: 2 },
    })
    expect(events.some((e) => e.type === 'error')).toBe(false)
  })
})

describe('chat() — explicit nonstream completion', () => {
  const tool = (argumentsText: string) => ({
    id: 't1',
    function: { name: 'write_file', arguments: argumentsText },
  })
  it.each([
    ['missing choice', { choices: [] }],
    ['tool finish without a tool', { choices: [{ finish_reason: 'tool_calls', message: {} }] }],
    ['missing finish reason', { choices: [{ message: { content: 'partial' } }] }],
    [
      'output token cap',
      {
        choices: [
          {
            finish_reason: 'length',
            message: { content: 'partial', tool_calls: [tool('{"path":"a.ts"}')] },
          },
        ],
      },
    ],
    [
      'malformed tool JSON',
      { choices: [{ finish_reason: 'tool_calls', message: { tool_calls: [tool('{"path":')] } }] },
    ],
    [
      'non-object tool JSON',
      { choices: [{ finish_reason: 'tool_calls', message: { tool_calls: [tool('[]')] } }] },
    ],
  ])('rejects %s without completing or dispatching a tool', async (_name, body) => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(200, body))
    const events = await drain(
      createProvider({ apiKey: 'k' }).chat({
        messages: [{ role: 'user', content: 'go' }],
        stream: false,
      }),
    )
    expect(events.filter((e) => e.type === 'error')).toHaveLength(1)
    expect(events.some((e) => e.type === 'done')).toBe(false)
    expect(events.some((e) => e.type === 'tool_use')).toBe(false)
    if (_name === 'output token cap')
      expect(events).toContainEqual({ type: 'text', content: 'partial' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('completes an explicitly finished JSON tool call and preserves usage', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, {
        choices: [
          { finish_reason: 'tool_calls', message: { tool_calls: [tool('{"path":"a.ts"}')] } },
        ],
        usage: { prompt_tokens: 4, completion_tokens: 2 },
      }),
    )
    const events = await drain(
      createProvider({ apiKey: 'k' }).chat({
        messages: [{ role: 'user', content: 'go' }],
        stream: false,
      }),
    )
    expect(events).toContainEqual({
      type: 'tool_use',
      id: 't1',
      name: 'write_file',
      input: { path: 'a.ts' },
    })
    expect(events.find((e) => e.type === 'done')).toMatchObject({
      usage: { inputTokens: 4, outputTokens: 2 },
    })
    expect(events.some((e) => e.type === 'error')).toBe(false)
  })
})

describe('chat() — native cache usage', () => {
  // Usage-only data retained from an actual native DeepSeek response. The exact
  // response already decoded correctly; optional-field projections below expose
  // the separate compatibility gap without claiming those observations failed.
  const recorded = {
    prompt_tokens: 44306,
    completion_tokens: 255,
    total_tokens: 44561,
    prompt_tokens_details: { cached_tokens: 44160 },
    prompt_cache_hit_tokens: 44160,
    prompt_cache_miss_tokens: 146,
  }
  const cases: Array<[string, Record<string, unknown>, number, number]> = [
    ['exact recorded usage', recorded, 146, 44160],
    [
      'native required fields with optional nested count omitted',
      { ...recorded, prompt_tokens_details: {} },
      146,
      44160,
    ],
    [
      'native fields take precedence over nested fallback',
      {
        prompt_tokens: 100,
        prompt_cache_hit_tokens: 40,
        prompt_cache_miss_tokens: 60,
        prompt_tokens_details: { cached_tokens: 90 },
      },
      60,
      40,
    ],
    [
      'native explicit zero takes precedence',
      {
        prompt_tokens: 100,
        prompt_cache_hit_tokens: 0,
        prompt_cache_miss_tokens: 100,
        prompt_tokens_details: { cached_tokens: 40 },
      },
      100,
      0,
    ],
    [
      'legacy nested fallback',
      { prompt_tokens: 100, prompt_tokens_details: { cached_tokens: 40 } },
      60,
      40,
    ],
    [
      'legacy explicit zero',
      { prompt_tokens: 100, prompt_tokens_details: { cached_tokens: 0 } },
      100,
      0,
    ],
    [
      'native pair without a total',
      { prompt_cache_hit_tokens: 40, prompt_cache_miss_tokens: 60 },
      60,
      40,
    ],
    ['native hit with derived miss', { prompt_tokens: 100, prompt_cache_hit_tokens: 40 }, 60, 40],
    [
      'native explicit miss zero',
      { prompt_tokens: 100, prompt_cache_hit_tokens: 40, prompt_cache_miss_tokens: 0 },
      0,
      40,
    ],
    ['uncached legacy usage', { prompt_tokens: 100 }, 100, 0],
    ['empty usage preserves defaults', {}, 0, 0],
  ]
  for (const stream of [true, false]) {
    it.each(cases)(
      String(stream) + ': decodes %s without double-counting',
      async (_name, raw, inputTokens, cacheReadInputTokens) => {
        const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
        const usage = { completion_tokens: 20, ...raw }
        fetch.mockResolvedValue(
          stream
            ? sseResponse([
                'data: ' +
                  JSON.stringify({
                    choices: [{ delta: { content: 'ok' }, finish_reason: 'stop' }],
                  }),
                'data: ' + JSON.stringify({ choices: [], usage }),
                'data: [DONE]',
              ])
            : jsonResponse(200, {
                choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
                usage,
              }),
        )
        const events = await drain(
          createProvider({ apiKey: 'k' }).chat({
            messages: [{ role: 'user', content: 'hi' }],
            stream,
          }),
        )
        expect(events.find((e) => e.type === 'done')).toMatchObject({
          usage: { inputTokens, cacheReadInputTokens, outputTokens: usage.completion_tokens },
        })
        expect(events.some((e) => e.type === 'error')).toBe(false)
        expect(fetch).toHaveBeenCalledTimes(1)
      },
    )
  }

  it.each(['native', 'legacy'])(
    'resets explicit zero counters in later %s usage snapshots',
    async (style) => {
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      const first =
        style === 'native'
          ? recorded
          : {
              prompt_tokens: 100,
              completion_tokens: 20,
              prompt_tokens_details: { cached_tokens: 40 },
            }
      const zero =
        style === 'native'
          ? {
              prompt_tokens: 0,
              completion_tokens: 0,
              prompt_cache_hit_tokens: 0,
              prompt_cache_miss_tokens: 0,
            }
          : { prompt_tokens: 0, completion_tokens: 0, prompt_tokens_details: { cached_tokens: 0 } }
      fetch.mockResolvedValue(
        sseResponse([
          'data: ' +
            JSON.stringify({ choices: [{ delta: { content: 'ok' }, finish_reason: 'stop' }] }),
          ...[first, zero].map((usage) => 'data: ' + JSON.stringify({ choices: [], usage })),
          'data: [DONE]',
        ]),
      )
      const events = await drain(
        createProvider({ apiKey: 'k' }).chat({ messages: [{ role: 'user', content: 'hi' }] }),
      )
      expect(events.find((e) => e.type === 'done')).toMatchObject({
        usage: { inputTokens: 0, cacheReadInputTokens: 0, outputTokens: 0 },
      })
    },
  )

  it('treats repeated native usage frames as snapshots, not additions', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: ' +
          JSON.stringify({ choices: [{ delta: { content: 'ok' }, finish_reason: 'stop' }] }),
        ...[recorded, recorded].map((usage) => 'data: ' + JSON.stringify({ choices: [], usage })),
        'data: [DONE]',
      ]),
    )
    const events = await drain(
      createProvider({ apiKey: 'k' }).chat({ messages: [{ role: 'user', content: 'hi' }] }),
    )
    expect(events.find((e) => e.type === 'done')).toMatchObject({
      usage: { inputTokens: 146, cacheReadInputTokens: 44160, outputTokens: 255 },
    })
  })
})
