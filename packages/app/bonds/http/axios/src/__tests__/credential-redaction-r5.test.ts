import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpError } from '@molecule/app-http'

import { createAxiosClient } from '../provider.js'

const rejectWith =
  (data: unknown) =>
  (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const response: AxiosResponse = {
      data,
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: { 'content-type': typeof data === 'string' ? 'text/plain' : 'application/json' },
      config,
    }
    return Promise.reject(
      new AxiosError(
        'Request failed with status code 422',
        'ERR_BAD_RESPONSE',
        config,
        undefined,
        response,
      ),
    )
  }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('round-five Axios retained response bodies', () => {
  it('scrubs a serialized JSON credential for responseType text', async () => {
    const client = createAxiosClient({
      axiosConfig: {
        adapter: rejectWith('{"password":"axios-text-secret","safe":"byte-for-byte"}'),
      },
      retry: false,
    })

    const caught = await client
      .get('/text', { responseType: 'text' })
      .catch((error: unknown) => error)

    expect(caught).toBeInstanceOf(HttpError)
    expect((caught as HttpError).response?.data).toBe(
      '{"password":"[REDACTED]","safe":"byte-for-byte"}',
    )
    expect(JSON.stringify(caught)).not.toContain('axios-text-secret')
  })

  it('preserves the complete 422 validation-message map', async () => {
    const sent = {
      errors: {
        password: ['is too short'],
        email: ['is invalid'],
      },
    }
    const client = createAxiosClient({ axiosConfig: { adapter: rejectWith(sent) }, retry: false })

    const caught = await client.post('/register', {}).catch((error: unknown) => error)

    expect(caught).toBeInstanceOf(HttpError)
    expect((caught as HttpError).response?.data).toStrictEqual(sent)
  })

  it('scrubs form-encoded text by decoded parameter name and preserves safe parameters', async () => {
    const client = createAxiosClient({
      axiosConfig: {
        adapter: rejectWith('pass%77ord=axios-form-secret&email=alice%40example.test&view=full'),
      },
      retry: false,
    })

    const caught = await client
      .get('/text', { responseType: 'text' })
      .catch((error: unknown) => error)

    expect(caught).toBeInstanceOf(HttpError)
    expect((caught as HttpError).response?.data).toBe(
      'pass%77ord=[REDACTED]&email=alice%40example.test&view=full',
    )
  })
})
