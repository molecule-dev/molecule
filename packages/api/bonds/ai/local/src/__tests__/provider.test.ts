import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatEvent } from '@molecule/api-ai'

import { createProvider, LocalAIProvider } from '../provider.js'

/** Build a mock JSON `Response` for non-streaming tests. */
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

/** Build a mock `Response` whose body streams the supplied SSE lines. */
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

/**
 * Drain a chat() stream, capturing every yielded event and any error the
 * generator throws (the provider throws AFTER emitting an `error` event on a
 * non-OK response).
 */
async function collect(iter: AsyncIterable<ChatEvent>): Promise<{
  events: ChatEvent[]
  thrown: unknown
}> {
  const events: ChatEvent[] = []
  let thrown: unknown
  try {
    for await (const e of iter) events.push(e)
  } catch (err) {
    thrown = err
  }
  return { events, thrown }
}

const fetchMock = () => globalThis.fetch as ReturnType<typeof vi.fn>
const lastInit = () => fetchMock().mock.calls[0][1] as RequestInit
const lastUrl = () => fetchMock().mock.calls[0][0] as string
const lastHeaders = () => lastInit().headers as Record<string, string>
const lastBody = () => JSON.parse((lastInit() as { body: string }).body) as Record<string, unknown>

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('fetch', vi.fn())
  // Isolate env-driven config so a stray env var can't skew the defaults.
  delete process.env.LOCAL_AI_BASE_URL
  delete process.env.OLLAMA_BASE_URL
  delete process.env.LOCAL_AI_API_KEY
  delete process.env.LOCAL_AI_MODEL
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createProvider / constructor', () => {
  it('factory returns a LocalAIProvider named "local"', () => {
    const provider = createProvider()
    expect(provider).toBeInstanceOf(LocalAIProvider)
    expect(provider.name).toBe('local')
  })

  it('constructs keyless without throwing (no config, no env)', () => {
    expect(() => createProvider()).not.toThrow()
    expect(() => createProvider({})).not.toThrow()
    expect(createProvider().name).toBe('local')
  })
})

describe('chat() — request shape', () => {
  it('defaults to Ollama base URL + /chat/completions and sends NO Authorization header (keyless)', async () => {
    fetchMock().mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'hi' } }], usage: {} }),
    )
    await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'hello' }], stream: false }),
    )
    expect(lastUrl()).toBe('http://localhost:11434/v1/chat/completions')
    expect(lastHeaders().Authorization).toBeUndefined()
    expect(lastHeaders()['Content-Type']).toBe('application/json')
  })

  it('sends an Authorization header ONLY when an apiKey is configured', async () => {
    fetchMock().mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'hi' } }], usage: {} }),
    )
    await collect(
      createProvider({ apiKey: 'local-secret' }).chat({
        messages: [{ role: 'user', content: 'hello' }],
        stream: false,
      }),
    )
    expect(lastHeaders().Authorization).toBe('Bearer local-secret')
  })

  it('reads the apiKey from LOCAL_AI_API_KEY when no config key is given', async () => {
    process.env.LOCAL_AI_API_KEY = 'env-key'
    fetchMock().mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'hi' } }], usage: {} }),
    )
    await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'hello' }], stream: false }),
    )
    expect(lastHeaders().Authorization).toBe('Bearer env-key')
  })

  it('uses a custom config.baseUrl (endpoint = baseUrl + /chat/completions)', async () => {
    fetchMock().mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'hi' } }], usage: {} }),
    )
    await collect(
      createProvider({ baseUrl: 'http://127.0.0.1:1234/v1' }).chat({
        messages: [{ role: 'user', content: 'hello' }],
        stream: false,
      }),
    )
    expect(lastUrl()).toBe('http://127.0.0.1:1234/v1/chat/completions')
  })

  it('honours LOCAL_AI_BASE_URL, then OLLAMA_BASE_URL, with config taking precedence', async () => {
    fetchMock().mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'hi' } }], usage: {} }),
    )
    // OLLAMA_BASE_URL fallback
    process.env.OLLAMA_BASE_URL = 'http://ollama.host:11434/v1'
    await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }], stream: false }),
    )
    expect(lastUrl()).toBe('http://ollama.host:11434/v1/chat/completions')

    // LOCAL_AI_BASE_URL wins over OLLAMA_BASE_URL
    vi.resetAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    fetchMock().mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'hi' } }], usage: {} }),
    )
    process.env.LOCAL_AI_BASE_URL = 'http://local.host/v1'
    await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }], stream: false }),
    )
    expect(lastUrl()).toBe('http://local.host/v1/chat/completions')

    // config.baseUrl beats both env vars
    vi.resetAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    fetchMock().mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'hi' } }], usage: {} }),
    )
    await collect(
      createProvider({ baseUrl: 'http://config.host/v1' }).chat({
        messages: [{ role: 'user', content: 'x' }],
        stream: false,
      }),
    )
    expect(lastUrl()).toBe('http://config.host/v1/chat/completions')
  })

  it('defaults the model to llama3.1, honours config.model, LOCAL_AI_MODEL, and per-call model', async () => {
    fetchMock().mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: '' } }], usage: {} }),
    )
    await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }], stream: false }),
    )
    expect(lastBody().model).toBe('llama3.1')

    vi.resetAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    fetchMock().mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: '' } }], usage: {} }),
    )
    process.env.LOCAL_AI_MODEL = 'qwen2.5'
    await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }], stream: false }),
    )
    expect(lastBody().model).toBe('qwen2.5')

    vi.resetAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    fetchMock().mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: '' } }], usage: {} }),
    )
    await collect(
      createProvider({ model: 'mistral' }).chat({
        messages: [{ role: 'user', content: 'x' }],
        model: 'phi3', // per-call wins
        stream: false,
      }),
    )
    expect(lastBody().model).toBe('phi3')
  })

  it('includes the system prompt as a leading {role:system} message and passes temperature', async () => {
    fetchMock().mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'ok' } }], usage: {} }),
    )
    await collect(
      createProvider().chat({
        messages: [{ role: 'user', content: 'hi' }],
        system: 'You are a teapot.',
        temperature: 0.3,
        stream: false,
      }),
    )
    const body = lastBody() as {
      messages: Array<{ role: string; content: string }>
      temperature: number
    }
    expect(body.messages[0]).toEqual({ role: 'system', content: 'You are a teapot.' })
    expect(body.messages[1]).toMatchObject({ role: 'user', content: 'hi' })
    expect(body.temperature).toBe(0.3)
  })

  it('formats tools + toolChoice into the OpenAI function shape', async () => {
    fetchMock().mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: '' } }], usage: {} }),
    )
    await collect(
      createProvider().chat({
        messages: [{ role: 'user', content: 'x' }],
        tools: [
          {
            name: 'add',
            description: 'Sum',
            parameters: { type: 'object' },
            execute: async () => 0,
          },
        ],
        toolChoice: { type: 'tool', name: 'add' },
        stream: false,
      }),
    )
    const body = lastBody() as {
      tools: Array<{ type: string; function: { name: string } }>
      tool_choice: unknown
    }
    expect(body.tools[0]).toMatchObject({ type: 'function', function: { name: 'add' } })
    expect(body.tool_choice).toEqual({ type: 'function', function: { name: 'add' } })
  })
})

describe('chat() — non-streaming response parsing', () => {
  it('yields text + done(usage) from a {choices:[{message:{content}}]} response', async () => {
    fetchMock().mockResolvedValue(
      jsonResponse(200, {
        choices: [{ message: { content: 'Hello!' } }],
        usage: { prompt_tokens: 5, completion_tokens: 2 },
      }),
    )
    const { events, thrown } = await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }], stream: false }),
    )
    expect(thrown).toBeUndefined()
    expect(events).toEqual([
      { type: 'text', content: 'Hello!' },
      { type: 'done', usage: { inputTokens: 5, outputTokens: 2, cacheReadInputTokens: 0 } },
    ])
  })

  it('yields tool_use for a message with tool_calls', async () => {
    fetchMock().mockResolvedValue(
      jsonResponse(200, {
        choices: [
          {
            message: {
              tool_calls: [{ id: 'c1', function: { name: 'add', arguments: '{"a":1}' } }],
            },
          },
        ],
        usage: {},
      }),
    )
    const { events } = await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }], stream: false }),
    )
    expect(events).toContainEqual({ type: 'tool_use', id: 'c1', name: 'add', input: { a: 1 } })
  })
})

describe('chat() — streaming response parsing', () => {
  it('yields text chunks then a final done(usage)', async () => {
    fetchMock().mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}',
        'data: {"choices":[{"delta":{"content":" world"}}]}',
        'data: {"usage":{"prompt_tokens":10,"completion_tokens":2}}',
        'data: [DONE]',
      ]),
    )
    const { events, thrown } = await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }] }),
    )
    expect(thrown).toBeUndefined()
    expect(events.filter((e) => e.type === 'text')).toEqual([
      { type: 'text', content: 'Hello' },
      { type: 'text', content: ' world' },
    ])
    expect(events.at(-1)).toEqual({
      type: 'done',
      usage: { inputTokens: 10, outputTokens: 2, cacheReadInputTokens: 0 },
    })
  })

  it('emits tool_use_start + tool_input_delta while streaming, then a completed tool_use', async () => {
    fetchMock().mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"add","arguments":"{\\"a\\":"}}]}}]}',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"1,\\"b\\":2}"}}]}}]}',
        'data: [DONE]',
      ]),
    )
    const { events } = await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }] }),
    )
    expect(events).toContainEqual({ type: 'tool_use_start', id: 'c1', name: 'add' })
    const deltas = events.filter((e) => e.type === 'tool_input_delta')
    expect(deltas.length).toBe(2)
    expect(deltas[0]).toMatchObject({ type: 'tool_input_delta', id: 'c1', chars: 5 })
    expect(events).toContainEqual({
      type: 'tool_use',
      id: 'c1',
      name: 'add',
      input: { a: 1, b: 2 },
    })
  })

  it('yields keep_alive for a data-bearing chunk that produces no other event (ping/empty delta)', async () => {
    fetchMock().mockResolvedValue(
      sseResponse([
        ': keepalive comment',
        'data: {"choices":[{"delta":{}}]}',
        'data: {"choices":[{"delta":{"content":"hi"}}]}',
        'data: [DONE]',
      ]),
    )
    const { events } = await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }] }),
    )
    expect(events.some((e) => e.type === 'keep_alive')).toBe(true)
    expect(events.filter((e) => e.type === 'text')).toEqual([{ type: 'text', content: 'hi' }])
  })

  it('silently skips malformed SSE JSON lines', async () => {
    fetchMock().mockResolvedValue(
      sseResponse([
        'data: {malformed',
        'data: {"choices":[{"delta":{"content":"ok"}}]}',
        'data: [DONE]',
      ]),
    )
    const { events } = await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }] }),
    )
    expect(events.filter((e) => e.type === 'text')).toEqual([{ type: 'text', content: 'ok' }])
  })

  it('yields partial text then a real error event (no misleading done) on a mid-stream error chunk', async () => {
    // A `data: {"error": {...}}` chunk mid-stream means the turn was truncated.
    // The parser must surface a real error event AND stop — never fall through
    // to a `done` that reports the truncated turn as a successful completion.
    fetchMock().mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"content":"partial"}}]}',
        'data: {"error":{"message":"Rate limit reached","type":"rate_limit_error","code":"rate_limit_exceeded"}}',
        'data: [DONE]',
      ]),
    )
    const { events, thrown } = await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }] }),
    )
    expect(thrown).toBeUndefined()
    expect(events).toContainEqual({ type: 'text', content: 'partial' })
    const err = events.find((e) => e.type === 'error') as
      | { type: 'error'; message: string; errorKey?: string }
      | undefined
    expect(err?.message).toBe('AI rate limit exceeded. Please try again shortly.')
    expect(err?.errorKey).toBe('ai.error.apiError')
    expect(events.some((e) => e.type === 'done')).toBe(false)
    expect(events.at(-1)).toEqual(err)
  })
})

describe('chat() — HTTP error handling (emits error EVENT + returns gracefully, no throw)', () => {
  it('500 → generic "AI service error" event with errorKey ai.error.apiError, no throw', async () => {
    fetchMock().mockResolvedValue(jsonResponse(500, { error: { message: 'boom' } }))
    const { events, thrown } = await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }], stream: false }),
    )
    expect(thrown).toBeUndefined()
    const err = events.find((e) => e.type === 'error') as
      | { message: string; errorKey?: string }
      | undefined
    expect(err?.message).toMatch(/service error/i)
    expect(err?.errorKey).toBe('ai.error.apiError')
  })

  it('404 → "endpoint or model not found" friendly message (server down / model not pulled), no throw', async () => {
    fetchMock().mockResolvedValue(jsonResponse(404, { error: { message: 'model not found' } }))
    const { events, thrown } = await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }], stream: false }),
    )
    expect(thrown).toBeUndefined()
    const err = events.find((e) => e.type === 'error') as
      | { message: string; errorKey?: string }
      | undefined
    expect(err?.message).toMatch(/not found/i)
    expect(err?.errorKey).toBe('ai.error.apiError')
  })

  it('401 → "configuration error" message that does NOT leak the upstream detail, no throw', async () => {
    fetchMock().mockResolvedValue(
      jsonResponse(401, { error: { message: 'Invalid API key sk-xxx' } }),
    )
    const { events, thrown } = await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }], stream: false }),
    )
    expect(thrown).toBeUndefined()
    const err = events.find((e) => e.type === 'error') as
      | { message: string; errorKey?: string }
      | undefined
    expect(err?.message).toMatch(/configuration error/i)
    expect(err?.message).not.toContain('sk-xxx')
    expect(err?.errorKey).toBe('ai.error.apiError')
  })

  it('a plain 400 (invalid param, not context-length) → distinct non-retryable message', async () => {
    // Regression: every non-context-length 400 used to fall through to the
    // same generic "AI service error. Please try again." as a genuinely
    // retryable 5xx.
    fetchMock().mockResolvedValue(
      jsonResponse(400, { error: { message: 'temperature must be <= 2' } }),
    )
    const { events, thrown } = await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }], stream: false }),
    )
    expect(thrown).toBeUndefined()
    const err = events.find((e) => e.type === 'error') as
      | { message: string; errorKey?: string }
      | undefined
    expect(err?.message).toBe('AI request was invalid — check the model and request parameters.')
    expect(err?.message).not.toBe('AI service error. Please try again.')
  })

  it('400 + context-length detail → "too long" message', async () => {
    fetchMock().mockResolvedValue(
      jsonResponse(400, { error: { message: 'context length exceeded' } }),
    )
    const { events } = await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }], stream: false }),
    )
    const err = events.find((e) => e.type === 'error') as { message: string } | undefined
    expect(err?.message).toMatch(/too long/i)
  })

  it('an HTTP-date Retry-After falls back to exponential backoff instead of a ~0ms retry', async () => {
    vi.useFakeTimers()
    try {
      let call = 0
      fetchMock().mockImplementation(() => {
        call += 1
        if (call === 1) {
          return Promise.resolve(
            jsonResponse(
              429,
              { error: { message: 'busy' } },
              { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' },
            ),
          )
        }
        return Promise.resolve(jsonResponse(200, { choices: [{ message: { content: 'ok' } }] }))
      })

      const collectPromise = collect(
        createProvider().chat({ messages: [{ role: 'user', content: 'x' }], stream: false }),
      )

      // A NaN-degraded delay (pre-fix) would have already retried well before
      // 500ms; the exponential-backoff fallback (attempt 0 = 1000ms) must not.
      await vi.advanceTimersByTimeAsync(500)
      expect(fetchMock()).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(2_000)
      const { thrown } = await collectPromise
      expect(thrown).toBeUndefined()
      expect(fetchMock()).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('non-abort network failure (e.g. connection refused) → error event + graceful return, no throw', async () => {
    fetchMock().mockRejectedValue(
      Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }),
    )
    const { events, thrown } = await collect(
      createProvider().chat({ messages: [{ role: 'user', content: 'x' }], stream: false }),
    )
    expect(thrown).toBeUndefined()
    const err = events.find((e) => e.type === 'error') as
      | { message: string; errorKey?: string }
      | undefined
    expect(err).toBeDefined()
    expect(err?.errorKey).toBe('ai.error.apiError')
  })
})

describe('chat() — deliberate abort', () => {
  it('propagates a client abort via params.signal as a THROW with NO error event', async () => {
    const controller = new AbortController()
    controller.abort()
    fetchMock().mockRejectedValue(
      Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }),
    )
    const { events, thrown } = await collect(
      createProvider().chat({
        messages: [{ role: 'user', content: 'x' }],
        stream: false,
        signal: controller.signal,
      }),
    )
    expect(thrown).toBeInstanceOf(Error)
    expect(events.some((e) => e.type === 'error')).toBe(false)
  })
})

describe('secret registration', () => {
  it('registers LOCAL_AI_BASE_URL + LOCAL_AI_API_KEY as OPTIONAL definitions', async () => {
    await import('../index.js')
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    const baseUrl = getSecretDefinition('LOCAL_AI_BASE_URL')
    const apiKey = getSecretDefinition('LOCAL_AI_API_KEY')
    expect(baseUrl).toBeDefined()
    expect(baseUrl?.required).toBe(false)
    expect(apiKey).toBeDefined()
    expect(apiKey?.required).toBe(false)
  })
})
