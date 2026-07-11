import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — keep the bond isolated from the logger + i18n runtime.
// ---------------------------------------------------------------------------

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  }),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? key,
}))

import { createProvider } from '../provider.js'

// ---------------------------------------------------------------------------
// Types + helpers
// ---------------------------------------------------------------------------

type Evt = { type: string; message?: string; [k: string]: unknown }

const mockFetch = vi.fn()

/** Collects all events from an async iterable. */
async function collectEvents(iterable: AsyncIterable<Evt>): Promise<Evt[]> {
  const events: Evt[] = []
  for await (const event of iterable) events.push(event)
  return events
}

/** Collects events AND captures a thrown error (this bond throws after emitting an error event). */
async function collectEventsCatch(
  iterable: AsyncIterable<Evt>,
): Promise<{ events: Evt[]; error: unknown }> {
  const events: Evt[] = []
  let error: unknown = null
  try {
    for await (const event of iterable) events.push(event)
  } catch (err) {
    error = err
  }
  return { events, error }
}

/** Encodes a Gemini response object as an SSE `data:` line. */
function sse(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n`
}

/** Builds a streaming Response whose reader emits each raw string as one `read()`. */
function streamRaw(chunks: string[]): Record<string, unknown> {
  const encoder = new TextEncoder()
  let i = 0
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    body: {
      getReader: () => ({
        read: () => {
          if (i >= chunks.length) return Promise.resolve({ done: true, value: undefined })
          return Promise.resolve({ done: false, value: encoder.encode(chunks[i++]) })
        },
        releaseLock: () => {},
      }),
    },
  }
}

/** An empty (immediately-done) stream response — used when only the request body matters. */
function emptyStream(): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    body: {
      getReader: () => ({
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        releaseLock: vi.fn(),
      }),
    },
  }
}

/** A minimal non-OK Response. */
function errorResponse(status: number, body: string): Record<string, unknown> {
  return {
    ok: false,
    status,
    statusText: `Status ${status}`,
    text: vi.fn().mockResolvedValue(body),
    json: vi.fn().mockRejectedValue(new Error('not json')),
    headers: new Headers(),
    body: null,
  }
}

const minimalParams = { messages: [{ role: 'user' as const, content: 'Hello' }] }

// ===========================================================================
// Streaming, request mapping, non-streaming (real timers)
// ===========================================================================

describe('GoogleAIProvider — streaming + request mapping', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const provider = createProvider({ apiKey: 'test-key', baseUrl: 'https://test.api' })
  const bodyOf = () =>
    JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
  const urlOf = () => (mockFetch.mock.calls[0] as [string, RequestInit])[0]

  it('streams text chunks, a tool_use (with tool_use_start), a usage snapshot, then done', async () => {
    mockFetch.mockResolvedValue(
      streamRaw([
        sse({ candidates: [{ content: { role: 'model', parts: [{ text: 'Hello ' }] } }] }),
        sse({ candidates: [{ content: { role: 'model', parts: [{ text: 'world' }] } }] }),
        sse({
          candidates: [
            {
              content: {
                role: 'model',
                parts: [{ functionCall: { name: 'write_file', args: { path: 'a.ts' } } }],
              },
            },
          ],
        }),
        sse({
          candidates: [{ content: { role: 'model', parts: [] }, finishReason: 'STOP' }],
          usageMetadata: {
            promptTokenCount: 12,
            candidatesTokenCount: 7,
            cachedContentTokenCount: 3,
          },
        }),
      ]),
    )

    const events = await collectEvents(provider.chat(minimalParams))

    // Text
    const texts = events.filter((e) => e.type === 'text').map((e) => e.content)
    expect(texts).toEqual(['Hello ', 'world'])

    // Tool: start surfaces before the complete call; both share a synthesized id.
    const start = events.find((e) => e.type === 'tool_use_start')!
    const use = events.find((e) => e.type === 'tool_use')!
    expect(start).toMatchObject({ type: 'tool_use_start', name: 'write_file' })
    expect(use).toMatchObject({ type: 'tool_use', name: 'write_file', input: { path: 'a.ts' } })
    expect(use.id).toBe(start.id)
    expect(events.findIndex((e) => e.type === 'tool_use_start')).toBeLessThan(
      events.findIndex((e) => e.type === 'tool_use'),
    )

    // Usage snapshot + final done carry identical, provider-reported counts.
    const usageEvt = events.find((e) => e.type === 'usage')!
    const doneEvt = events.find((e) => e.type === 'done')!
    const expectedUsage = { inputTokens: 12, outputTokens: 7, cacheReadInputTokens: 3 }
    expect(usageEvt.usage).toEqual(expectedUsage)
    expect(doneEvt.usage).toEqual(expectedUsage)

    // Every read produced an event → no silent keep_alives here.
    expect(events.some((e) => e.type === 'keep_alive')).toBe(false)
    // done is last.
    expect(events[events.length - 1].type).toBe('done')
  })

  it('emits keep_alive for a chunk that produces no ChatEvent (SSE ping)', async () => {
    mockFetch.mockResolvedValue(
      streamRaw([
        ': keepalive ping\n', // comment line — not a `data:` event
        sse({ candidates: [{ content: { role: 'model', parts: [{ text: 'hi' }] } }] }),
      ]),
    )

    const events = await collectEvents(provider.chat(minimalParams))

    expect(events.some((e) => e.type === 'keep_alive')).toBe(true)
    expect(events.some((e) => e.type === 'text' && e.content === 'hi')).toBe(true)
  })

  it('emits thinking for parts flagged thought:true', async () => {
    mockFetch.mockResolvedValue(
      streamRaw([
        sse({
          candidates: [
            { content: { role: 'model', parts: [{ text: 'pondering', thought: true }] } },
          ],
        }),
        sse({ candidates: [{ content: { role: 'model', parts: [{ text: 'answer' }] } }] }),
      ]),
    )

    const events = await collectEvents(provider.chat(minimalParams))
    expect(events.find((e) => e.type === 'thinking')).toMatchObject({ content: 'pondering' })
    expect(events.find((e) => e.type === 'text')).toMatchObject({ content: 'answer' })
  })

  it('targets the streaming endpoint with alt=sse and the key in the query', async () => {
    mockFetch.mockResolvedValue(emptyStream())
    await collectEvents(provider.chat(minimalParams))
    expect(urlOf()).toBe(
      'https://test.api/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=test-key',
    )
  })

  it('maps system→systemInstruction, roles, tools, toolChoice, and generationConfig', async () => {
    mockFetch.mockResolvedValue(emptyStream())
    await collectEvents(
      provider.chat({
        system: 'You are helpful',
        messages: [
          { role: 'user', content: 'Hi' },
          {
            role: 'assistant',
            content: [{ type: 'tool_use', id: 't1', name: 'search', input: { q: 'x' } }],
          },
          {
            role: 'user',
            content: [{ type: 'tool_result', tool_use_id: 't1', content: 'result text' }],
          },
        ],
        tools: [
          {
            name: 'search',
            description: 'Search the web',
            parameters: {
              type: 'object',
              properties: { q: { type: 'string' } },
              required: ['q'],
            },
            execute: vi.fn(),
          },
        ],
        toolChoice: 'required',
        temperature: 0.3,
        maxTokens: 2048,
      }),
    )

    const body = bodyOf()
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'You are helpful' }] })
    // Roles: user→user, assistant→model.
    expect(body.contents[0]).toEqual({ role: 'user', parts: [{ text: 'Hi' }] })
    expect(body.contents[1].role).toBe('model')
    expect(body.contents[1].parts[0]).toEqual({
      functionCall: { name: 'search', args: { q: 'x' } },
    })
    // tool_result → functionResponse, name recovered from the earlier tool_use id.
    expect(body.contents[2].role).toBe('user')
    expect(body.contents[2].parts[0]).toEqual({
      functionResponse: { name: 'search', response: { result: 'result text' } },
    })
    // Tools → single-entry functionDeclarations, parameters passed through.
    expect(body.tools[0].functionDeclarations[0]).toEqual({
      name: 'search',
      description: 'Search the web',
      parameters: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] },
    })
    // toolChoice 'required' → ANY.
    expect(body.toolConfig.functionCallingConfig).toEqual({ mode: 'ANY' })
    // temperature + maxTokens → generationConfig.
    expect(body.generationConfig).toEqual({ temperature: 0.3, maxOutputTokens: 2048 })
  })

  it("maps a { type: 'tool', name } toolChoice to ANY + allowedFunctionNames", async () => {
    mockFetch.mockResolvedValue(emptyStream())
    await collectEvents(
      provider.chat({
        ...minimalParams,
        tools: [
          {
            name: 'commit',
            description: 'Commit',
            parameters: { type: 'object' },
            execute: vi.fn(),
          },
        ],
        toolChoice: { type: 'tool', name: 'commit' },
      }),
    )
    expect(bodyOf().toolConfig.functionCallingConfig).toEqual({
      mode: 'ANY',
      allowedFunctionNames: ['commit'],
    })
  })

  it("maps toolChoice 'auto' to mode AUTO", async () => {
    mockFetch.mockResolvedValue(emptyStream())
    await collectEvents(
      provider.chat({
        ...minimalParams,
        tools: [{ name: 'x', description: 'x', parameters: { type: 'object' }, execute: vi.fn() }],
        toolChoice: 'auto',
      }),
    )
    expect(bodyOf().toolConfig.functionCallingConfig).toEqual({ mode: 'AUTO' })
  })

  it('maps image/document content blocks to inlineData', async () => {
    mockFetch.mockResolvedValue(emptyStream())
    await collectEvents(
      provider.chat({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'look' },
              { type: 'image', mediaType: 'image/png', data: 'AAAA' },
              { type: 'document', mediaType: 'application/pdf', data: 'BBBB' },
            ],
          },
        ],
      }),
    )
    const parts = bodyOf().contents[0].parts
    expect(parts[0]).toEqual({ text: 'look' })
    expect(parts[1]).toEqual({ inlineData: { mimeType: 'image/png', data: 'AAAA' } })
    expect(parts[2]).toEqual({ inlineData: { mimeType: 'application/pdf', data: 'BBBB' } })
  })

  it('adds thinkingConfig only for a thinking-capable model, never for gemini-2.0-flash', async () => {
    // 2.5 model → thinkingConfig present.
    mockFetch.mockResolvedValue(emptyStream())
    await collectEvents(
      provider.chat({
        ...minimalParams,
        model: 'gemini-2.5-flash',
        thinking: { type: 'enabled', budgetTokens: 4096 },
      }),
    )
    expect(bodyOf().generationConfig.thinkingConfig).toEqual({
      includeThoughts: true,
      thinkingBudget: 4096,
    })

    // 2.0-flash → thinkingConfig omitted (it would 400).
    mockFetch.mockClear()
    mockFetch.mockResolvedValue(emptyStream())
    await collectEvents(
      provider.chat({
        ...minimalParams,
        model: 'gemini-2.0-flash',
        thinking: { type: 'enabled', budgetTokens: 4096 },
      }),
    )
    expect(bodyOf().generationConfig?.thinkingConfig).toBeUndefined()
  })

  it('parses a non-streaming response (:generateContent, key in query)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({
        candidates: [
          {
            content: {
              role: 'model',
              parts: [{ text: 'Done' }, { functionCall: { name: 'f', args: { a: 1 } } }],
            },
          },
        ],
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 },
      }),
    })

    const events = await collectEvents(provider.chat({ ...minimalParams, stream: false }))

    expect(urlOf()).toBe('https://test.api/models/gemini-2.0-flash:generateContent?key=test-key')
    expect(events.find((e) => e.type === 'text')).toMatchObject({ content: 'Done' })
    expect(events.find((e) => e.type === 'tool_use')).toMatchObject({
      name: 'f',
      input: { a: 1 },
    })
    expect(events.find((e) => e.type === 'done')!.usage).toEqual({
      inputTokens: 5,
      outputTokens: 2,
    })
  })

  it('honours the default base URL when none is configured', async () => {
    const prev = process.env.GOOGLE_AI_BASE_URL
    delete process.env.GOOGLE_AI_BASE_URL
    try {
      mockFetch.mockResolvedValue(emptyStream())
      const p = createProvider({ apiKey: 'test-key' })
      await collectEvents(p.chat(minimalParams))
      expect(urlOf()).toBe(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=test-key',
      )
    } finally {
      if (prev === undefined) delete process.env.GOOGLE_AI_BASE_URL
      else process.env.GOOGLE_AI_BASE_URL = prev
    }
  })
})

// ===========================================================================
// Errors, retries, abort (fake timers so retry backoff resolves)
// ===========================================================================

describe('GoogleAIProvider — errors, retries, abort', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.useFakeTimers()
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const provider = createProvider({ apiKey: 'test-key', baseUrl: 'https://test.api' })

  it('non-OK HTTP emits a sanitized error event and returns gracefully (no throw)', async () => {
    mockFetch.mockResolvedValue(
      errorResponse(400, JSON.stringify({ error: { message: 'model xyz not found' } })),
    )

    // collectEvents rejects if the generator throws — so a clean resolution here
    // proves the generator RETURNS after emitting the error event (mirrors the
    // sibling providers; molecule-dev's chat-handler routes emitted error events
    // through its `case 'error':` branch, distinct from its outer try/catch).
    const events = await collectEvents(provider.chat(minimalParams))

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      type: 'error',
      message: 'AI service error. Please try again.',
      errorKey: 'ai.error.apiError',
    })
  })

  it('401/403 maps to a configuration error and does not leak the raw body', async () => {
    mockFetch.mockResolvedValue(
      errorResponse(403, JSON.stringify({ error: { message: 'API key AIzaSECRET is invalid' } })),
    )

    const events = await collectEvents(provider.chat(minimalParams))

    expect(events[0].message).toBe('AI service configuration error.')
    expect(events[0].message).not.toContain('AIzaSECRET')
    expect(events[0].errorKey).toBe('ai.error.apiError')
  })

  it('400 context-length error maps to the "too long" message', async () => {
    mockFetch.mockResolvedValue(
      errorResponse(
        400,
        JSON.stringify({ error: { message: 'The input token count exceeds the maximum' } }),
      ),
    )
    const events = await collectEvents(provider.chat(minimalParams))
    expect(events[0].message).toContain('too long')
  })

  it('retries 429 then, on exhaustion, emits an error event and returns (no throw)', async () => {
    mockFetch.mockResolvedValue(
      errorResponse(429, JSON.stringify({ error: { message: 'RESOURCE_EXHAUSTED' } })),
    )

    const promise = collectEvents(provider.chat(minimalParams))
    await vi.advanceTimersByTimeAsync(60_000) // exhaust backoff delays
    const events = await promise

    // 1 initial + 3 retries.
    expect(mockFetch).toHaveBeenCalledTimes(4)
    expect(events).toHaveLength(1)
    expect(events[0].message).toBe('AI rate limit exceeded. Please try again shortly.')
    expect(events[0].errorKey).toBe('ai.error.apiError')
  })

  it('a non-abort stream error emits an error event and returns (no throw)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      body: {
        getReader: () => ({
          read: vi.fn().mockRejectedValue(new Error('connection reset mid-stream')),
          releaseLock: vi.fn(),
        }),
      },
    })

    const events = await collectEvents(provider.chat(minimalParams))

    expect(events.some((e) => e.type === 'error' && e.errorKey === 'ai.error.apiError')).toBe(true)
    // No `done` after a stream failure.
    expect(events.some((e) => e.type === 'done')).toBe(false)
  })

  it('forwards the caller-provided abort signal to fetch', async () => {
    const controller = new AbortController()
    mockFetch.mockResolvedValue(emptyStream())

    await collectEvents(provider.chat({ ...minimalParams, signal: controller.signal }))

    const init = (mockFetch.mock.calls[0] as [string, RequestInit])[1]
    expect(init.signal).toBe(controller.signal)
  })

  it('sets a default timeout signal when the caller provides none', async () => {
    mockFetch.mockResolvedValue(emptyStream())
    await collectEvents(provider.chat(minimalParams))
    const init = (mockFetch.mock.calls[0] as [string, RequestInit])[1]
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(init.signal!.aborted).toBe(false)
  })

  it('propagates an abort (fetch rejection) as a throw without an error event', async () => {
    const abortErr = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
    mockFetch.mockRejectedValue(abortErr)

    const { events, error } = await collectEventsCatch(
      provider.chat({ ...minimalParams, signal: new AbortController().signal }),
    )

    // A deliberate abort is a clean disconnect — no error event, just propagation.
    expect(events).toHaveLength(0)
    expect(error).toBe(abortErr)
  })
})

// ===========================================================================
// Construction guard + secret registration
// ===========================================================================

describe('GoogleAIProvider — construction', () => {
  it('throws a clear error when GOOGLE_AI_API_KEY is missing', () => {
    const prev = process.env.GOOGLE_AI_API_KEY
    delete process.env.GOOGLE_AI_API_KEY
    try {
      expect(() => createProvider()).toThrow(/GOOGLE_AI_API_KEY/)
    } finally {
      if (prev === undefined) delete process.env.GOOGLE_AI_API_KEY
      else process.env.GOOGLE_AI_API_KEY = prev
    }
  })

  it('exposes the provider name "google"', () => {
    expect(createProvider({ apiKey: 'k' }).name).toBe('google')
  })
})

describe('secret registration', () => {
  it('registers GOOGLE_AI_API_KEY in the @molecule/api-secrets registry', async () => {
    await import('../index.js')
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    expect(getSecretDefinition('GOOGLE_AI_API_KEY')).toBeDefined()
  })
})
