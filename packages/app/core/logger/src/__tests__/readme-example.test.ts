/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the built-in console provider
 * with the console silenced and the remote transport's `fetch` stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createConsoleLoggerProvider,
  createLogger,
  createRemoteTransport,
  getProvider,
  setProvider,
  warn,
} from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('logs to the console by name and batches warn+ entries to the remote endpoint', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    setProvider(createConsoleLoggerProvider(import.meta.env.DEV ? 'debug' : 'info'))
    getProvider().addTransport(createRemoteTransport({ url: '/api/client-logs', minLevel: 'warn' }))

    const log = createLogger('sync')
    log.info('sync started', { pending: 3 })

    let parseError: Error | undefined
    try {
      JSON.parse('{ not json')
    } catch (err) {
      parseError = err as Error
      log.error(err as Error, { source: 'cache' })
    }
    warn('cache miss', { key: 'user:42' })

    expect(consoleInfo).toHaveBeenCalledWith('[sync]', 'sync started', { pending: 3 })
    expect(consoleError).toHaveBeenCalledWith('[sync]', parseError?.message, parseError, {
      source: 'cache',
    })
    expect(consoleWarn).toHaveBeenCalledWith('cache miss', { key: 'user:42' })

    expect(fetchMock).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api/client-logs')
    const body = JSON.parse(String(init?.body)) as {
      logs: Array<{ level: string; logger?: string }>
    }
    expect(body.logs.map((entry) => [entry.level, entry.logger])).toEqual([
      ['error', 'sync'],
      ['warn', undefined],
    ])
  })
})
