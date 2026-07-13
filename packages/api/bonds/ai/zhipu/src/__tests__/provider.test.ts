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
  it('returns a provider with name "zhipu"', () => {
    expect(createProvider({ apiKey: 'k' }).name).toBe('zhipu')
  })

  it('falls back to ZHIPU_API_KEY env var when no config', () => {
    const prev = process.env.ZHIPU_API_KEY
    process.env.ZHIPU_API_KEY = 'env-key'
    try {
      expect(createProvider().name).toBe('zhipu')
    } finally {
      if (prev === undefined) delete process.env.ZHIPU_API_KEY
      else process.env.ZHIPU_API_KEY = prev
    }
  })

  it('throws naming ZHIPU_API_KEY when no key is configured (config or env)', () => {
    const prev = process.env.ZHIPU_API_KEY
    delete process.env.ZHIPU_API_KEY
    try {
      expect(() => createProvider()).toThrow(/ZHIPU_API_KEY/)
    } finally {
      if (prev === undefined) delete process.env.ZHIPU_API_KEY
      else process.env.ZHIPU_API_KEY = prev
    }
  })
})

describe('chat()', () => {
  it('POSTs to default baseUrl https://api.z.ai/api/paas/v4/chat/completions with Bearer auth', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'hi' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'zhipu-key' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
    })) {
      // drain
    }
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://api.z.ai/api/paas/v4/chat/completions')
    expect(((init as RequestInit).headers as Record<string, string>).Authorization).toBe(
      'Bearer zhipu-key',
    )
  })

  it('honours ZHIPU_BASE_URL env var', async () => {
    const prev = process.env.ZHIPU_BASE_URL
    process.env.ZHIPU_BASE_URL = 'https://gateway.broker/api/paas'
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
      expect(fetch.mock.calls[0][0]).toBe('https://gateway.broker/api/paas/v4/chat/completions')
    } finally {
      if (prev === undefined) delete process.env.ZHIPU_BASE_URL
      else process.env.ZHIPU_BASE_URL = prev
    }
  })

  it('config.baseUrl takes precedence over ZHIPU_BASE_URL env var', async () => {
    const prev = process.env.ZHIPU_BASE_URL
    process.env.ZHIPU_BASE_URL = 'https://env.broker/api/paas'
    try {
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockResolvedValue(
        jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
      )
      const provider = createProvider({ apiKey: 'k', baseUrl: 'https://config.broker/api/paas' })
      for await (const _ of provider.chat({
        messages: [{ role: 'user', content: 'h' }],
        stream: false,
      })) {
        // drain
      }
      expect(fetch.mock.calls[0][0]).toBe('https://config.broker/api/paas/v4/chat/completions')
    } finally {
      if (prev === undefined) delete process.env.ZHIPU_BASE_URL
      else process.env.ZHIPU_BASE_URL = prev
    }
  })

  it('defaults model to glm-5', async () => {
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
    expect(body.model).toBe('glm-5')
  })

  it('uses max_completion_tokens (not max_tokens)', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
    )
    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      maxTokens: 2048,
      stream: false,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.max_completion_tokens).toBe(2048)
  })

  it('places system prompt as leading {role:system}', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
    )
    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      system: 'tone',
      stream: false,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.messages[0]).toEqual({ role: 'system', content: 'tone' })
  })

  it('non-streaming emits text + done', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, {
        choices: [{ message: { content: 'reply' } }],
        usage: { prompt_tokens: 4, completion_tokens: 2 },
      }),
    )
    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
    })) {
      events.push(e)
    }
    expect(events).toEqual([
      { type: 'text', content: 'reply' },
      { type: 'done', usage: { inputTokens: 4, outputTokens: 2 } },
    ])
  })

  it('streaming parses delta.content', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: ' + JSON.stringify({ choices: [{ delta: { content: 'A' } }] }),
        'data: ' + JSON.stringify({ choices: [{ delta: { content: 'B' } }] }),
        'data: [DONE]',
      ]),
    )
    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({ messages: [{ role: 'user', content: 'h' }] })) {
      events.push(e)
    }
    expect(events.filter((e) => (e as { type: string }).type === 'text')).toEqual([
      { type: 'text', content: 'A' },
      { type: 'text', content: 'B' },
    ])
  })

  it('tool_use with parsed JSON arguments', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, {
        choices: [
          {
            message: {
              tool_calls: [{ id: 'c1', function: { name: 'op', arguments: '{"x":7}' } }],
            },
          },
        ],
        usage: {},
      }),
    )
    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
    })) {
      events.push(e)
    }
    expect(events.find((e) => (e as { type: string }).type === 'tool_use')).toEqual({
      type: 'tool_use',
      id: 'c1',
      name: 'op',
      input: { x: 7 },
    })
  })

  it('401 → "configuration error" without leaking upstream API key', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(401, { error: { message: 'Auth failed for zhipu-secret-7777' } }),
    )
    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
    })) {
      events.push(e)
    }
    const err = events.find((e) => (e as { type: string }).type === 'error') as { message: string }
    expect(err.message).toMatch(/configuration error/i)
    expect(err.message).not.toContain('zhipu-secret-7777')
  })

  it('400 + context-length detail → "Conversation too long" message', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(400, { error: { message: 'context length exceeded' } }))
    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
    })) {
      events.push(e)
    }
    const err = events.find((e) => (e as { type: string }).type === 'error') as { message: string }
    expect(err.message).toMatch(/Conversation too long/i)
  })

  it('a plain 400 (invalid param, not context-length) → distinct non-retryable message', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(400, { error: { message: 'temperature must be <= 2' } }))
    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
    })) {
      events.push(e)
    }
    const err = events.find((e) => (e as { type: string }).type === 'error') as { message: string }
    expect(err.message).toBe('AI request was invalid — check the model and request parameters.')
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
        return Promise.resolve(jsonResponse(200, { choices: [{ message: { content: 'ok' } }] }))
      })

      const provider = createProvider({ apiKey: 'k' })
      const eventsPromise = (async () => {
        const events: unknown[] = []
        for await (const e of provider.chat({
          messages: [{ role: 'user', content: 'h' }],
          stream: false,
        })) {
          events.push(e)
        }
        return events
      })()

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
  it('registers ZHIPU_API_KEY in the @molecule/api-secrets registry', async () => {
    await import('../index.js')
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    expect(getSecretDefinition('ZHIPU_API_KEY')).toBeDefined()
  })
})
