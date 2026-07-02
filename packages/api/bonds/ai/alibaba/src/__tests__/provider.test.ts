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
  it('returns a provider with name "alibaba"', () => {
    expect(createProvider({ apiKey: 'k' }).name).toBe('alibaba')
  })

  it('falls back to DASHSCOPE_API_KEY env var', () => {
    const prevDash = process.env.DASHSCOPE_API_KEY
    const prevAli = process.env.ALIBABA_API_KEY
    delete process.env.ALIBABA_API_KEY
    process.env.DASHSCOPE_API_KEY = 'dash-key'
    try {
      expect(createProvider().name).toBe('alibaba')
    } finally {
      if (prevDash === undefined) delete process.env.DASHSCOPE_API_KEY
      else process.env.DASHSCOPE_API_KEY = prevDash
      if (prevAli !== undefined) process.env.ALIBABA_API_KEY = prevAli
    }
  })

  it('falls back to ALIBABA_API_KEY when DASHSCOPE_API_KEY is unset', () => {
    const prevDash = process.env.DASHSCOPE_API_KEY
    const prevAli = process.env.ALIBABA_API_KEY
    delete process.env.DASHSCOPE_API_KEY
    process.env.ALIBABA_API_KEY = 'ali-key'
    try {
      expect(createProvider().name).toBe('alibaba')
    } finally {
      if (prevDash !== undefined) process.env.DASHSCOPE_API_KEY = prevDash
      if (prevAli === undefined) delete process.env.ALIBABA_API_KEY
      else process.env.ALIBABA_API_KEY = prevAli
    }
  })
})

describe('chat()', () => {
  it('POSTs to default DashScope baseUrl with Bearer auth', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'hi' } }], usage: {} }),
    )

    const provider = createProvider({ apiKey: 'qwen-key' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      stream: false,
    })) {
      // drain
    }
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions')
    expect(((init as RequestInit).headers as Record<string, string>).Authorization).toBe(
      'Bearer qwen-key',
    )
  })

  it('honours DASHSCOPE_BASE_URL env var', async () => {
    const prev = process.env.DASHSCOPE_BASE_URL
    process.env.DASHSCOPE_BASE_URL = 'https://custom.dashscope'
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
      expect(fetch.mock.calls[0][0]).toBe('https://custom.dashscope/v1/chat/completions')
    } finally {
      if (prev === undefined) delete process.env.DASHSCOPE_BASE_URL
      else process.env.DASHSCOPE_BASE_URL = prev
    }
  })

  it('config.baseUrl takes precedence over DASHSCOPE_BASE_URL env var', async () => {
    const prev = process.env.DASHSCOPE_BASE_URL
    process.env.DASHSCOPE_BASE_URL = 'https://env.dashscope'
    try {
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockResolvedValue(
        jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
      )
      const provider = createProvider({ apiKey: 'k', baseUrl: 'https://config.dashscope' })
      for await (const _ of provider.chat({
        messages: [{ role: 'user', content: 'h' }],
        stream: false,
      })) {
        // drain
      }
      expect(fetch.mock.calls[0][0]).toBe('https://config.dashscope/v1/chat/completions')
    } finally {
      if (prev === undefined) delete process.env.DASHSCOPE_BASE_URL
      else process.env.DASHSCOPE_BASE_URL = prev
    }
  })

  it('defaults model to qwen3.6-plus', async () => {
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
    expect(body.model).toBe('qwen3.6-plus')
  })

  it('uses max_completion_tokens', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: 'h' } }], usage: {} }),
    )
    const provider = createProvider({ apiKey: 'k' })
    for await (const _ of provider.chat({
      messages: [{ role: 'user', content: 'h' }],
      maxTokens: 512,
      stream: false,
    })) {
      // drain
    }
    const body = JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.max_completion_tokens).toBe(512)
  })

  it('non-streaming emits text + done', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(200, {
        choices: [{ message: { content: 'ack' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
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
      { type: 'text', content: 'ack' },
      { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
    ])
  })

  it('streaming parses delta.content', async () => {
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

  it('401 → "configuration error" without leaking API key', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(
      jsonResponse(401, { error: { message: 'Bad key dashscope-secret-2026' } }),
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
    expect(err.message).not.toContain('dashscope-secret-2026')
  })
})

describe('secret registration', () => {
  it('registers DASHSCOPE_API_KEY in the @molecule/api-secrets registry', async () => {
    await import('../index.js')
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    expect(getSecretDefinition('DASHSCOPE_API_KEY')).toBeDefined()
  })
})
