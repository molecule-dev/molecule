import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpError } from '@molecule/app-http'
import {
  createConsoleLoggerProvider,
  createRemoteTransport,
  getLogger,
  setProvider,
} from '@molecule/app-logger'

import { createAxiosClient } from '../provider.js'

const LOG_URL = 'https://logs.example.test/axios-r4'

const unavailable = (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  const response: AxiosResponse = {
    data: { error: 'Unavailable' },
    status: 503,
    statusText: 'Unavailable',
    headers: { 'content-type': 'application/json' },
    config,
  }
  return Promise.reject(
    new AxiosError(
      'Request failed with status code 503',
      'ERR_BAD_RESPONSE',
      config,
      undefined,
      response,
    ),
  )
}

afterEach(() => {
  setProvider(createConsoleLoggerProvider('silent'))
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Axios URL credential redaction', () => {
  it.each([
    ['auth_token', '/auth?auth_token=axios-family-secret&view=full'],
    ['fragment session_token', '/auth#session_token=axios-fragment-secret&view=full'],
    ['percent-encoded token', '/auth?%74oken=axios-encoded-secret&view=full'],
  ])('redacts %s in the error and real remote payload', async (_name, url) => {
    const secret = url.match(/=([^=&]+)/)?.[1]
    if (!secret) throw new Error('Expected a fixture credential')
    const remotePayloads: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toBe(LOG_URL)
        remotePayloads.push(String(init?.body))
        return Promise.resolve(new Response(null, { status: 204 }))
      }),
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const provider = createConsoleLoggerProvider('warn')
    provider.addTransport(createRemoteTransport({ url: LOG_URL, batchSize: 1 }))
    setProvider(provider)
    const client = createAxiosClient({ axiosConfig: { adapter: unavailable }, retry: false })

    const error = await client.get(url).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(HttpError)
    expect((error as HttpError).config?.url).toContain('view=full')
    getLogger('axios-r4').warn('Axios request failed', error)
    expect(remotePayloads).toHaveLength(1)
    for (const output of [JSON.stringify(error), String(error), ...remotePayloads]) {
      expect(output).not.toContain(secret)
    }
  })
})
