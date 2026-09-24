import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatEvent, ChatParams } from '@molecule/api-ai'

import { createProvider } from '../provider.js'

/**
 * Build a mock `Response` that yields the supplied JSON.
 */
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Build a mock SSE `Response` from Responses API events (shapes captured from
 * the live API, 2026-09-24).
 */
function sseResponse(events: unknown[]): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const e of events) {
        const type = (e as { type: string }).type
        controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(e)}\n\n`))
      }
      controller.close()
    },
  })
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } })
}

const completed = (usage: unknown): unknown => ({
  type: 'response.completed',
  response: { status: 'completed', usage },
})

/**
 * Run one chat() call and collect its events.
 */
async function run(params: Partial<ChatParams>, config = {}): Promise<ChatEvent[]> {
  const provider = createProvider({ apiKey: 'k', ...config })
  const events: ChatEvent[] = []
  for await (const e of provider.chat({ messages: [{ role: 'user', content: 'hi' }], ...params })) {
    events.push(e)
  }
  return events
}

/**
 * The JSON body of the first fetch call.
 */
function sentBody(): Record<string, unknown> {
  const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
  return JSON.parse((fetch.mock.calls[0][1] as RequestInit).body as string)
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('endpoint selection', () => {
  const ok = (): Response => jsonResponse(200, { output: [], usage: {} })

  it('uses /v1/responses on OpenAI’s own API by default', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(ok())
    await run({ stream: false })
    expect(fetch.mock.calls[0][0]).toBe('https://api.openai.com/v1/responses')
  })

  it('uses /v1/responses when baseUrl is explicitly OpenAI’s host', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(ok())
    await run({ stream: false }, { baseUrl: 'https://api.openai.com' })
    expect(fetch.mock.calls[0][0]).toBe('https://api.openai.com/v1/responses')
  })

  it('uses /v1/chat/completions for any other baseUrl (OpenAI-compatible servers)', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(jsonResponse(200, { choices: [], usage: {} }))
    await run({ stream: false }, { baseUrl: 'https://compat.test' })
    expect(fetch.mock.calls[0][0]).toBe('https://compat.test/v1/chat/completions')
  })

  it('config.api overrides the default in either direction', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(ok())
    await run({ stream: false }, { baseUrl: 'https://proxy.test', api: 'responses' })
    expect(fetch.mock.calls[0][0]).toBe('https://proxy.test/v1/responses')
  })
})

describe('Responses request shape', () => {
  beforeEach(() => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse(200, { output: [], usage: {} }),
    )
  })

  it('sends system as instructions, max_output_tokens, store:false, reasoning.effort', async () => {
    await run({
      stream: false,
      system: 'be terse',
      model: 'gpt-6-astra',
      maxTokens: 999,
      thinking: { type: 'enabled', budgetTokens: 0, effort: 'high' },
      endUserId: 'hash-1',
    })
    const body = sentBody()
    expect(body).toMatchObject({
      model: 'gpt-6-astra',
      instructions: 'be terse',
      max_output_tokens: 999,
      store: false,
      reasoning: { effort: 'high' },
      safety_identifier: 'hash-1',
      input: [{ role: 'user', content: 'hi' }],
    })
    expect(body).not.toHaveProperty('messages')
    expect(body).not.toHaveProperty('max_completion_tokens')
    expect(body).not.toHaveProperty('reasoning_effort')
  })

  it('replays tool_use / tool_result as function_call / function_call_output items WITHOUT item ids', async () => {
    await run({
      stream: false,
      messages: [
        { role: 'user', content: 'weather?' },
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Checking.' },
            { type: 'tool_use', id: 'call_1', name: 'get_weather', input: { city: 'Paris' } },
          ],
        },
        {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'call_1', content: 'Sunny' }],
        },
      ],
    })
    expect(sentBody().input).toEqual([
      { role: 'user', content: 'weather?' },
      { role: 'assistant', content: [{ type: 'output_text', text: 'Checking.' }] },
      {
        type: 'function_call',
        call_id: 'call_1',
        name: 'get_weather',
        arguments: '{"city":"Paris"}',
      },
      { type: 'function_call_output', call_id: 'call_1', output: 'Sunny' },
    ])
  })

  it('sends user images as input_image data URLs', async () => {
    await run({
      stream: false,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'what is this' },
            { type: 'image', mediaType: 'image/png', data: 'AAA' },
          ],
        },
      ],
    })
    expect(sentBody().input).toEqual([
      {
        role: 'user',
        content: [
          { type: 'input_text', text: 'what is this' },
          { type: 'input_image', image_url: 'data:image/png;base64,AAA' },
        ],
      },
    ])
  })

  it('sends flat, non-strict function tools plus server tools (name dropped)', async () => {
    await run({
      stream: false,
      tools: [
        {
          name: 'add',
          description: 'adds',
          parameters: { type: 'object', properties: {} },
          execute: async () => 0,
        },
      ],
      serverTools: [{ type: 'web_search', name: 'web_search' }],
      toolChoice: { type: 'tool', name: 'add' },
    })
    const body = sentBody()
    expect(body.tools).toEqual([
      {
        type: 'function',
        name: 'add',
        description: 'adds',
        parameters: { type: 'object', properties: {} },
        strict: false,
      },
      { type: 'web_search' },
    ])
    expect(body.tool_choice).toEqual({ type: 'function', name: 'add' })
  })
})

describe('Responses parsing', () => {
  it('non-streaming: yields text, tool_use, and usage with cache read/write split out', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse(200, {
        output: [
          { type: 'reasoning', summary: [] },
          { type: 'message', content: [{ type: 'output_text', text: 'hello' }] },
          { type: 'function_call', call_id: 'c1', name: 'add', arguments: '{"a":1}' },
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 7,
          input_tokens_details: { cached_tokens: 30, cache_write_tokens: 50 },
        },
      }),
    )
    expect(await run({ stream: false })).toEqual([
      { type: 'text', content: 'hello' },
      { type: 'tool_use', id: 'c1', name: 'add', input: { a: 1 } },
      {
        type: 'done',
        usage: {
          inputTokens: 20,
          outputTokens: 7,
          cacheReadInputTokens: 30,
          cacheCreationInputTokens: 50,
        },
      },
    ])
  })

  it('streaming: text deltas, tool-call start/progress/complete, then done', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      sseResponse([
        { type: 'response.created', response: { status: 'in_progress' } },
        { type: 'response.output_text.delta', item_id: 'msg_1', delta: 'Hi' },
        {
          type: 'response.output_item.added',
          item: {
            id: 'fc_1',
            type: 'function_call',
            call_id: 'call_1',
            name: 'add',
            arguments: '',
          },
        },
        { type: 'response.function_call_arguments.delta', item_id: 'fc_1', delta: '{"a":' },
        { type: 'response.function_call_arguments.delta', item_id: 'fc_1', delta: '1}' },
        {
          type: 'response.output_item.done',
          item: {
            id: 'fc_1',
            type: 'function_call',
            call_id: 'call_1',
            name: 'add',
            arguments: '{"a":1}',
          },
        },
        completed({
          input_tokens: 10,
          output_tokens: 3,
          input_tokens_details: { cached_tokens: 4 },
        }),
      ]),
    )
    const events = (await run({})).filter((e) => e.type !== 'keep_alive')
    expect(events).toEqual([
      { type: 'text', content: 'Hi' },
      { type: 'tool_use_start', id: 'call_1', name: 'add' },
      { type: 'tool_input_delta', id: 'call_1', chars: 5, text: '{"a":' },
      { type: 'tool_input_delta', id: 'call_1', chars: 2, text: '1}' },
      { type: 'tool_use', id: 'call_1', name: 'add', input: { a: 1 } },
      { type: 'done', usage: { inputTokens: 6, outputTokens: 3, cacheReadInputTokens: 4 } },
    ])
  })

  it('streaming: response.incomplete (output limit hit) still ends with done', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      sseResponse([
        { type: 'response.output_text.delta', delta: 'partial' },
        {
          type: 'response.incomplete',
          response: {
            incomplete_details: { reason: 'max_output_tokens' },
            usage: { input_tokens: 5, output_tokens: 9 },
          },
        },
      ]),
    )
    const events = await run({})
    expect(events.at(-1)).toEqual({
      type: 'done',
      usage: { inputTokens: 5, outputTokens: 9, cacheReadInputTokens: 0 },
    })
  })

  it('streaming: an error event surfaces as error and no done follows', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      sseResponse([
        { type: 'response.output_text.delta', delta: 'x' },
        { type: 'error', code: 'rate_limit_exceeded', message: 'Rate limit reached' },
        completed({ input_tokens: 1, output_tokens: 1 }),
      ]),
    )
    const events = await run({})
    expect(events.find((e) => e.type === 'error')).toMatchObject({
      message: 'AI rate limit exceeded. Please try again shortly.',
    })
    expect(events.find((e) => e.type === 'done')).toBeUndefined()
  })

  it('streaming: response.failed surfaces its nested error', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      sseResponse([
        {
          type: 'response.failed',
          response: { error: { code: 'server_error', message: 'The server is overloaded' } },
        },
      ]),
    )
    const events = await run({})
    expect(events.at(-1)).toMatchObject({
      type: 'error',
      message: 'AI service is temporarily overloaded. Please try again in a moment.',
    })
  })

  it('streaming: a stream cut before a terminal event is an error, not a done', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      sseResponse([{ type: 'response.output_text.delta', delta: 'x' }]),
    )
    const events = await run({})
    expect(events.at(-1)).toMatchObject({ type: 'error' })
    expect(events.find((e) => e.type === 'done')).toBeUndefined()
  })

  it('streaming: events that carry nothing (server-tool progress) yield keep_alive', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      sseResponse([
        { type: 'response.web_search_call.searching', item_id: 'ws_1' },
        completed({ input_tokens: 1, output_tokens: 1 }),
      ]),
    )
    const events = await run({})
    expect(events.some((e) => e.type === 'keep_alive')).toBe(true)
    expect(events.at(-1)?.type).toBe('done')
  })
})
