import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'

import { HttpError } from '@molecule/app-http'

import { createAxiosClient } from '../provider.js'

const rejectWith =
  (data: unknown, responseType?: 'arraybuffer' | 'blob') =>
  (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const response: AxiosResponse = {
      data,
      status: 503,
      statusText: 'Unavailable',
      headers: { 'content-type': 'application/json' },
      config: responseType ? { ...config, responseType } : config,
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

describe('round-six Axios retained bodies', () => {
  it('scrubs a UTF-8 arraybuffer failure into a new ArrayBuffer', async () => {
    const bytes = new TextEncoder().encode('{"password":"axios-buffer-secret","safe":"same"}')
    const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    const client = createAxiosClient({
      axiosConfig: { adapter: rejectWith(data, 'arraybuffer') },
      retry: false,
    })

    const caught = await client
      .get('/buffer', { responseType: 'arraybuffer' })
      .catch((error: unknown) => error)

    expect(caught).toBeInstanceOf(HttpError)
    const retained = (caught as HttpError).response?.data
    expect(retained).toBeInstanceOf(ArrayBuffer)
    expect(retained).not.toBe(data)
    expect(new TextDecoder().decode(retained as ArrayBuffer)).toBe(
      '{"password":"[REDACTED]","safe":"same"}',
    )
  })

  it('accepts a bare form segment in a real Axios rejection', async () => {
    const client = createAxiosClient({
      axiosConfig: { adapter: rejectWith('password=axios-bare-form-secret&flag&empty=&view=full') },
      retry: false,
    })

    const caught = await client
      .get('/text', { responseType: 'text' })
      .catch((error: unknown) => error)

    expect((caught as HttpError).response?.data).toBe('password=[REDACTED]&flag&empty=&view=full')
  })
})
