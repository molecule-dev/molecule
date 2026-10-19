vi.mock('@molecule/app-i18n', () => ({
  t: vi.fn(
    (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  ),
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HttpChatProvider } from '../provider.js'

/**
 * A streaming response whose body is the given SSE lines.
 *
 * @param lines - The raw SSE lines.
 * @returns A fetch Response stand-in.
 */
function stream(lines: string[]): Record<string, unknown> {
  const encoder = new TextEncoder()
  const body = lines.join('\n') + '\n'
  let read = false
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'text/event-stream' }),
    body: {
      getReader: () => ({
        read: vi.fn().mockImplementation(() => {
          if (read) return Promise.resolve({ done: true, value: undefined })
          read = true
          return Promise.resolve({ done: false, value: encoder.encode(body) })
        }),
      }),
    },
  }
}

/**
 * A non-streaming failure response.
 *
 * @param status - The HTTP status.
 * @param headers - Response headers.
 * @returns A fetch Response stand-in.
 */
function failure(status: number, headers: Record<string, string> = {}): Record<string, unknown> {
  return {
    ok: false,
    status,
    statusText: 'Error',
    headers: new Headers(headers),
    text: () => Promise.resolve('{}'),
    body: null,
  }
}

describe('@molecule/app-ai-chat-http stream resume', () => {
  const mockFetch = vi.fn()
  const config = { endpoint: '/api/chat', model: 'test' }

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('remembers the last SSE id and sends it as Last-Event-ID on a resume', async () => {
    mockFetch
      .mockResolvedValueOnce(stream(['id: 7', 'data: {"type":"text","content":"hi"}']))
      .mockResolvedValueOnce(stream(['data: {"type":"done"}']))

    const provider = new HttpChatProvider()
    await provider.sendMessage('Hi', config, vi.fn())
    expect(provider.getLastEventId()).toBe('7')

    await provider.sendMessage('', { ...config, resume: true }, vi.fn())

    const init = mockFetch.mock.calls[1][1] as { headers: Record<string, string> }
    expect(init.headers['Last-Event-ID']).toBe('7')
    expect(init.headers['Accept']).toBe('text/event-stream')
  })

  it('lets the caller override the resume cursor', async () => {
    mockFetch.mockResolvedValueOnce(stream(['data: {"type":"done"}']))

    const provider = new HttpChatProvider()
    await provider.sendMessage('', { ...config, resume: true, lastEventId: '42' }, vi.fn())

    const init = mockFetch.mock.calls[0][1] as { headers: Record<string, string> }
    expect(init.headers['Last-Event-ID']).toBe('42')
  })

  it('retries a resume answered 503, honoring Retry-After', async () => {
    mockFetch
      .mockResolvedValueOnce(failure(503, { 'retry-after': '0' }))
      .mockResolvedValueOnce(failure(502))
      .mockResolvedValueOnce(stream(['data: {"type":"done"}']))

    const onEvent = vi.fn()
    await new HttpChatProvider().sendMessage('', { ...config, resume: true }, onEvent)

    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(onEvent.mock.calls.some(([event]) => event.type === 'done')).toBe(true)
  })

  it('does not retry a FRESH send on 503 (it may create a turn)', async () => {
    mockFetch.mockResolvedValueOnce(failure(503))

    const onEvent = vi.fn()
    await new HttpChatProvider().sendMessage('Hi', config, onEvent)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(onEvent.mock.calls[0][0]).toMatchObject({ type: 'error', status: 503 })
  })

  it('gives up after the bounded resume retries', async () => {
    mockFetch
      .mockResolvedValueOnce(failure(503, { 'retry-after': '0' }))
      .mockResolvedValueOnce(failure(503, { 'retry-after': '0' }))
      .mockResolvedValueOnce(failure(503, { 'retry-after': '0' }))

    const onEvent = vi.fn()
    await new HttpChatProvider().sendMessage('', { ...config, resume: true }, onEvent)

    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(onEvent.mock.calls[0][0]).toMatchObject({ type: 'error', status: 503 })
  })
})
