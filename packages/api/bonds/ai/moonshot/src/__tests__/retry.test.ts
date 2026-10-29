import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatEvent, ChatParams } from '@molecule/api-ai'

import { createProvider } from '../provider.js'

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

async function collect(provider: ReturnType<typeof createProvider>, params: ChatParams) {
  const events: ChatEvent[] = []
  for await (const event of provider.chat(params)) events.push(event)
  return events
}

const overloaded = () => jsonResponse(503, { error: { message: 'Kimi is overloaded' } })
const toolSuccess = () =>
  jsonResponse(200, {
    choices: [
      {
        message: {
          content: null,
          tool_calls: [
            {
              id: 'pending-call',
              type: 'function',
              function: { name: 'read_file', arguments: '{"path":"src/provider.ts"}' },
            },
          ],
        },
      },
    ],
    usage: { prompt_tokens: 20, completion_tokens: 4 },
  })

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('configurable same-request overload retries', () => {
  it('until-aborted survives five overloads and replays the exact history, tools and request id', async () => {
    vi.useFakeTimers()
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockImplementation(() =>
      Promise.resolve(fetch.mock.calls.length <= 5 ? overloaded() : toolSuccess()),
    )
    const controller = new AbortController()
    const rateLimits: unknown[] = []
    const provider = createProvider({
      apiKey: 'test-key',
      rateLimitRetries: 'until-aborted',
      onRateLimit: (event) => rateLimits.push(event),
    })
    const messages: ChatParams['messages'] = [
      { role: 'user', content: 'Inspect this source.' },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'I will read it.' },
          { type: 'tool_use', id: 'completed-call', name: 'list_files', input: { path: '.' } },
        ],
        reasoning: 'preserve-this-reasoning',
      },
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'completed-call', content: 'src/provider.ts' },
        ],
      },
    ]
    const originalMessages = structuredClone(messages)
    const params: ChatParams = {
      messages,
      tools: [
        {
          name: 'read_file',
          description: 'Read source',
          parameters: { type: 'object', properties: { path: { type: 'string' } } },
        },
      ],
      cacheControl: { type: 'ephemeral' },
      requestId: 'same-request-across-overloads',
      signal: controller.signal,
      stream: false,
    }

    const result = collect(provider, params)
    await vi.runAllTimersAsync()
    const events = await result

    expect(fetch).toHaveBeenCalledTimes(6)
    expect(rateLimits).toHaveLength(5)
    const requests = fetch.mock.calls.map(([, init]) => init as RequestInit)
    expect(new Set(requests.map((request) => request.body)).size).toBe(1)
    expect(
      new Set(
        requests.map((request) => (request.headers as Record<string, string>)['X-Mol-Request-Id']),
      ),
    ).toEqual(new Set(['same-request-across-overloads']))
    const wire = JSON.parse(requests[0].body as string)
    expect(wire.messages).toHaveLength(3)
    expect(wire.messages[1].tool_calls[0].id).toBe('completed-call')
    expect(wire.messages[1].reasoning_content).toBe('preserve-this-reasoning')
    expect(wire.messages[2].tool_call_id).toBe('completed-call')
    expect(wire.tools[0].function.name).toBe('read_file')
    expect(messages).toEqual(originalMessages)
    expect(events).toContainEqual({
      type: 'tool_use',
      id: 'pending-call',
      name: 'read_file',
      input: { path: 'src/provider.ts' },
    })
    expect(events.at(-1)).toEqual({
      type: 'done',
      usage: { inputTokens: 20, outputTokens: 4 },
    })
  })

  it('keeps the historical default of three retries (four posts) before failing', async () => {
    vi.useFakeTimers()
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockImplementation(() => Promise.resolve(overloaded()))
    const result = collect(createProvider({ apiKey: 'test-key' }), {
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
    })
    await vi.runAllTimersAsync()
    const events = await result
    expect(fetch).toHaveBeenCalledTimes(4)
    expect(events.at(-1)).toMatchObject({ type: 'error', message: /overloaded/ })
  })

  it.each([401, 400])(
    'does not retry permanent HTTP %i failures in until-aborted mode',
    async (status) => {
      const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
      fetch.mockResolvedValue(jsonResponse(status, { error: { message: 'invalid request' } }))
      const events = await collect(
        createProvider({ apiKey: 'test-key', rateLimitRetries: 'until-aborted' }),
        {
          messages: [{ role: 'user', content: 'hello' }],
          signal: new AbortController().signal,
          stream: false,
        },
      )
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(events.at(-1)?.type).toBe('error')
    },
  )

  it('requires caller cancellation before until-aborted can make a request', async () => {
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    await expect(
      collect(createProvider({ apiKey: 'test-key', rateLimitRetries: 'until-aborted' }), {
        messages: [{ role: 'user', content: 'hello' }],
      }),
    ).rejects.toThrow(/until-aborted.*signal/i)
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([-1, 1.5, Number.POSITIVE_INFINITY, Number.NaN])(
    'rejects invalid bounded retry count %s',
    (rateLimitRetries) => {
      expect(() => createProvider({ apiKey: 'test-key', rateLimitRetries })).toThrow(
        /rateLimitRetries/,
      )
    },
  )

  it('cancels backoff promptly, removes its listener and never posts again', async () => {
    vi.useFakeTimers()
    const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
    fetch.mockResolvedValue(overloaded())
    const controller = new AbortController()
    const add = vi.spyOn(controller.signal, 'addEventListener')
    const remove = vi.spyOn(controller.signal, 'removeEventListener')
    const provider = createProvider({
      apiKey: 'test-key',
      rateLimitRetries: 'until-aborted',
      onRateLimit: () => queueMicrotask(() => controller.abort(new Error('caller stopped'))),
    })
    const result = collect(provider, {
      messages: [{ role: 'user', content: 'hello' }],
      signal: controller.signal,
      stream: false,
    })
    await expect(result).rejects.toThrow('caller stopped')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(add).toHaveBeenCalledWith('abort', expect.any(Function), { once: true })
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function))
    await vi.runAllTimersAsync()
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
