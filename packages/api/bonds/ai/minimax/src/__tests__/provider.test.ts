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
  it('returns a provider with name "minimax"', () => {
    expect(createProvider({ apiKey: 'k' }).name).toBe('minimax')
  })

  it('falls back to MINIMAX_API_KEY env var when no config', () => {
    const prev = process.env.MINIMAX_API_KEY
    process.env.MINIMAX_API_KEY = 'env-key'
    try {
      expect(createProvider().name).toBe('minimax')
    } finally {
      if (prev === undefined) delete process.env.MINIMAX_API_KEY
      else process.env.MINIMAX_API_KEY = prev
    }
  })
})

describe('chat()', () => {
  it('POSTs to default baseUrl https://api.minimax.chat/v1/chat/completions with Bearer auth', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'hi' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'mini-key' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
    })) {
      // drain
    }
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://api.minimax.chat/v1/chat/completions')
    expect(((init as RequestInit).headers as Record<string, string>).Authorization).toBe(
      'Bearer mini-key',
    )
  })

  it('honours MINIMAX_BASE_URL env var', async () => {
    const prev = process.env.MINIMAX_BASE_URL
    process.env.MINIMAX_BASE_URL = 'https://gateway.broker'
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
      if (prev === undefined) delete process.env.MINIMAX_BASE_URL
      else process.env.MINIMAX_BASE_URL = prev
    }
  })

  it('config.baseUrl takes precedence over MINIMAX_BASE_URL env var', async () => {
    const prev = process.env.MINIMAX_BASE_URL
    process.env.MINIMAX_BASE_URL = 'https://env.broker'
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
      if (prev === undefined) delete process.env.MINIMAX_BASE_URL
      else process.env.MINIMAX_BASE_URL = prev
    }
  })

  it('defaults model to minimax-m2.5', async () => {
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
    expect(body.model).toBe('minimax-m2.5')
  })

  it('uses max_completion_tokens (not max_tokens)', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
    )
    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      maxTokens: 800,
      stream: false,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.max_completion_tokens).toBe(800)
    expect(body.max_tokens).toBeUndefined()
  })

  it('places system prompt as leading {role:system}', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
    )
    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      system: 'rules',
      stream: false,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.messages[0]).toEqual({ role: 'system', content: 'rules' })
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
    expect(body.tools[0]).toEqual({
      type: 'function',
      function: { name: 'add', description: 'sum', parameters: { type: 'object' } },
    })
  })

  it('non-streaming emits text + done with usage', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, {
        choices: [{ message: { content: 'Yo' } }],
        usage: { prompt_tokens: 2, completion_tokens: 1 },
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
      { type: 'text', content: 'Yo' },
      { type: 'done', usage: { inputTokens: 2, outputTokens: 1 } },
    ])
  })

  it('streaming parses delta.content from SSE lines', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      sseResponse([
        'data: ' + JSON.stringify({ choices: [{ delta: { content: 'one' } }] }),
        'data: ' + JSON.stringify({ choices: [{ delta: { content: 'two' } }] }),
        'data: [DONE]',
      ]),
    )
    const provider = createProvider({ apiKey: 'k' })
    const events: unknown[] = []
    for await (const e of provider.chat({ messages: [{ role: 'user', content: 'h' }] })) {
      events.push(e)
    }
    expect(events.filter((e) => (e as { type: string }).type === 'text')).toEqual([
      { type: 'text', content: 'one' },
      { type: 'text', content: 'two' },
    ])
  })

  it('401 → "configuration error" without leaking upstream API key', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(401, { error: { message: 'Invalid token mini-secret-9999' } }),
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
    expect(err.message).not.toContain('mini-secret-9999')
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

  it('M3: thinking requested → thinking adaptive; omitted → explicitly disabled', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    // Fresh Response per call — a Body can only be consumed once.
    fetch.mockImplementation(() =>
      jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
    )
    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      model: 'minimax-m3',
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
      thinking: { type: 'enabled', budgetTokens: 16_000 },
    })) {
      // drain
    }
    let body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    // MiniMax has no reasoning_effort; M3's control is thinking.type.
    expect(body.thinking).toEqual({ type: 'adaptive' })
    expect(body.reasoning_effort).toBeUndefined()
    // Thinking must land in reasoning_content, not inline <think> text.
    expect(body.reasoning_split).toBe(true)

    // Omitted thinking → M3 is explicitly disabled (the OpenAI-compatible
    // endpoint would otherwise default to adaptive).
    for await (const _ of provider.chat({
      model: 'minimax-m3',
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
    })) {
      // drain
    }
    body = JSON.parse((fetch.mock.calls[1][1] as RequestInit).body as string)
    expect(body.thinking).toEqual({ type: 'disabled' })
  })

  it('M2.x: never sends a thinking param (always-on upstream, not configurable)', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
    )
    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      model: 'minimax-m2.7',
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.thinking).toBeUndefined()
    expect(body.reasoning_effort).toBeUndefined()
    expect(body.reasoning_split).toBe(true)
  })
})

describe('secret registration', () => {
  it('registers MINIMAX_API_KEY in the @molecule/api-secrets registry', async () => {
    await import('../index.js')
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    expect(getSecretDefinition('MINIMAX_API_KEY')).toBeDefined()
  })
})
