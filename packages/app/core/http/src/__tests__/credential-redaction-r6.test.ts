import { afterEach, describe, expect, it, vi } from 'vitest'

import { createFetchClient, HttpError } from '../index.js'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const failure = (body: BodyInit, contentType: string): Response =>
  new Response(body, { status: 503, headers: { 'content-type': contentType } })

describe('round-six retained binary response bodies', () => {
  it('scrubs a UTF-8 ArrayBuffer failure body into a new ArrayBuffer', async () => {
    const bytes = new TextEncoder().encode('{"password":"fetch-buffer-secret","safe":"same"}')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(failure(bytes, 'application/json'))),
    )

    const caught = await createFetchClient({ retry: false })
      .get('/buffer', { responseType: 'arraybuffer' })
      .catch((error: unknown) => error)

    expect(caught).toBeInstanceOf(HttpError)
    const data = (caught as HttpError).response?.data
    expect(data).toBeInstanceOf(ArrayBuffer)
    expect(data).not.toBe(bytes.buffer)
    expect(new TextDecoder().decode(data as ArrayBuffer)).toBe(
      '{"password":"[REDACTED]","safe":"same"}',
    )
    expect(new TextDecoder().decode(bytes)).toContain('fetch-buffer-secret')
  })

  it('keeps non-text ArrayBuffer failure bytes unchanged', async () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0xfd, 0x00])
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(failure(bytes, 'application/octet-stream'))),
    )

    const caught = await createFetchClient({ retry: false })
      .get('/binary', { responseType: 'arraybuffer' })
      .catch((error: unknown) => error)

    const data = (caught as HttpError).response?.data as ArrayBuffer
    expect(data).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(data)).toEqual(bytes)
  })

  it('scrubs readable Blob text into a new Blob of the same type without damaging the original', async () => {
    const original = new Blob(['{"password":"fetch-blob-secret","safe":"same"}'], {
      type: 'application/json',
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(failure(original, 'application/json'))),
    )

    const caught = await createFetchClient({ retry: false })
      .get('/blob', { responseType: 'blob' })
      .catch((error: unknown) => error)

    const data = (caught as HttpError).response?.data as Blob
    expect(data).toBeInstanceOf(Blob)
    expect(data).not.toBe(original)
    expect(data.type).toBe('application/json')
    await expect(data.text()).resolves.toBe('{"password":"[REDACTED]","safe":"same"}')
    await expect(original.text()).resolves.toContain('fetch-blob-secret')
  })
})
