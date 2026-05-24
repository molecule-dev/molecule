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
  it('returns a provider with name "moonshot"', () => {
    const provider = createProvider({ apiKey: 'k' })
    expect(provider.name).toBe('moonshot')
  })

  it('falls back to MOONSHOT_API_KEY env var when no config', () => {
    const prev = process.env.MOONSHOT_API_KEY
    process.env.MOONSHOT_API_KEY = 'env-key'
    try {
      expect(createProvider().name).toBe('moonshot')
    } finally {
      if (prev === undefined) delete process.env.MOONSHOT_API_KEY
      else process.env.MOONSHOT_API_KEY = prev
    }
  })
})

describe('chat() — request shape', () => {
  it('POSTs to default baseUrl https://api.moonshot.ai/v1/chat/completions with Bearer auth', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'hi' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'kimi-key' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
    })) {
      // drain
    }
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://api.moonshot.ai/v1/chat/completions')
    expect(((init as RequestInit).headers as Record<string, string>).Authorization).toBe(
      'Bearer kimi-key',
    )
  })

  it('honours config.baseUrl override', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
    )
    const provider = createProvider({ apiKey: 'k', baseUrl: 'https://proxy.test' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
    })) {
      // drain
    }
    expect(fetch.mock.calls[0][0]).toBe('https://proxy.test/v1/chat/completions')
  })

  it('honours MOONSHOT_BASE_URL env var', async () => {
    const prev = process.env.MOONSHOT_BASE_URL
    process.env.MOONSHOT_BASE_URL = 'https://gateway.broker'
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
      if (prev === undefined) delete process.env.MOONSHOT_BASE_URL
      else process.env.MOONSHOT_BASE_URL = prev
    }
  })

  it('config.baseUrl takes precedence over MOONSHOT_BASE_URL env var', async () => {
    const prev = process.env.MOONSHOT_BASE_URL
    process.env.MOONSHOT_BASE_URL = 'https://env.broker'
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
      if (prev === undefined) delete process.env.MOONSHOT_BASE_URL
      else process.env.MOONSHOT_BASE_URL = prev
    }
  })

  it('defaults model to kimi-k2.5', async () => {
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
    expect(body.model).toBe('kimi-k2.5')
  })

  it('uses max_completion_tokens (not max_tokens)', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
    )
    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      maxTokens: 999,
      stream: false,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.max_completion_tokens).toBe(999)
    expect(body.max_tokens).toBeUndefined()
  })

  it('places system prompt as leading {role:system}', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'ok' } }], usage: {} }),
    )
    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      system: 'be brief',
      stream: false,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.messages[0]).toEqual({ role: 'system', content: 'be brief' })
  })

  it('formats tools as {type:function, function:{...}}', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
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

  describe('KIMI_REASONING_EFFORT env-var paths (when no thinking specified)', () => {
    const original = process.env.KIMI_REASONING_EFFORT
    afterEach(() => {
      if (original === undefined) delete process.env.KIMI_REASONING_EFFORT
      else process.env.KIMI_REASONING_EFFORT = original
    })

    it('defaults to "disabled" → no reasoning_effort, no temperature', async () => {
      delete process.env.KIMI_REASONING_EFFORT
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
      expect(body.reasoning_effort).toBeUndefined()
    })

    it('"high" → sets reasoning_effort: high', async () => {
      process.env.KIMI_REASONING_EFFORT = 'high'
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
      expect(body.reasoning_effort).toBe('high')
    })

    it('case-insensitive ("HIGH" works)', async () => {
      process.env.KIMI_REASONING_EFFORT = 'HIGH'
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
      expect(body.reasoning_effort).toBe('high')
    })

    it('unknown effort string → reasoning_effort omitted', async () => {
      process.env.KIMI_REASONING_EFFORT = 'bogus'
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
      expect(body.reasoning_effort).toBeUndefined()
    })
  })
})

describe('chat() — response handling', () => {
  it('non-streaming: emits text + done with usage', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, {
        choices: [{ message: { content: 'Hello' } }],
        usage: { prompt_tokens: 3, completion_tokens: 1 },
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
      { type: 'text', content: 'Hello' },
      { type: 'done', usage: { inputTokens: 3, outputTokens: 1 } },
    ])
  })

  it('streaming: parses delta.content from data: SSE lines', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: ' + JSON.stringify({ choices: [{ delta: { content: 'foo' } }] }),
        'data: ' + JSON.stringify({ choices: [{ delta: { content: 'bar' } }] }),
        'data: [DONE]',
      ]),
    )
    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({ messages: [{ role: 'user', content: 'h' }] })) {
      events.push(e)
    }
    expect(events.filter((e) => (e as { type: string }).type === 'text')).toEqual([
      { type: 'text', content: 'foo' },
      { type: 'text', content: 'bar' },
    ])
  })

  it('401 → "configuration error" — does NOT leak upstream API key in message', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(401, { error: { message: 'Invalid API key kimi-secret-1234' } }),
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
    expect(err.message).not.toContain('kimi-secret-1234')
  })

  it('400 + "context length" → "Conversation too long"', async () => {
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
})
