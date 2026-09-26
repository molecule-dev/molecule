import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider, MoleculeServiceError, OCR_SERVICE_LIMITS } from '../provider.js'

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

/** Stub fetch with `status` and `body`. */
function stubFetch(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const fn = vi
    .fn()
    .mockResolvedValue(
      new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
    )
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api-ocr-molecule', () => {
  it('posts the base64 image to ocr/recognize and returns the result', async () => {
    const fetchMock = stubFetch(200, { text: 'HELLO', pages: [{ pageNumber: 1, text: 'HELLO' }] })
    const result = await createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    }).recognize({ data: new Uint8Array(PNG_1PX), mimeType: 'image/png' })
    expect(result.text).toBe('HELLO')
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    const body = JSON.parse(String(init.body)) as Record<string, string>
    expect(body.mimeType).toBe('image/png')
    expect(Buffer.from(body.image, 'base64').toString()).toBe(PNG_1PX.toString())
  })

  it('refuses an oversized image locally, before any request', async () => {
    const fetchMock = stubFetch(200, {})
    await expect(
      createProvider({ apiKey: 'mk_test' }).recognize({
        data: new Uint8Array(OCR_SERVICE_LIMITS.maxImageBytes + 1),
        mimeType: 'image/png',
      }),
    ).rejects.toMatchObject({ status: 413, errorKey: 'hostedServices.error.inputTooLarge' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws MoleculeServiceError without a key, before any request', async () => {
    const fetchMock = stubFetch(200, {})
    const old = process.env.MOLECULE_API_KEY
    delete process.env.MOLECULE_API_KEY
    try {
      await expect(
        createProvider({ servicesUrl: 'http://localhost:1/api/v1/services' }).recognize({
          data: new Uint8Array(PNG_1PX),
          mimeType: 'image/png',
        }),
      ).rejects.toMatchObject({ status: 401 })
    } finally {
      if (old !== undefined) process.env.MOLECULE_API_KEY = old
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [401, 'hostedServices.error.tokenInvalid'],
    [402, 'broker.error.budgetExceeded'],
    [429, 'broker.error.rateLimited'],
  ])('maps a %i refusal to a MoleculeServiceError with the service errorKey', async (status) => {
    stubFetch(status, { error: 'refused', errorKey: 'some.key' })
    const error = await createProvider({ apiKey: 'mk_bad' })
      .recognize({
        data: new Uint8Array(PNG_1PX),
        mimeType: 'image/png',
      })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(MoleculeServiceError)
    expect((error as MoleculeServiceError).status).toBe(status)
    expect((error as MoleculeServiceError).errorKey).toBe('some.key')
  })

  it('reports a non-JSON gateway body by status only', async () => {
    stubFetch(502, '<html>Bad Gateway</html>')
    const error = await createProvider({ apiKey: 'mk_test' })
      .recognize({
        data: new Uint8Array(PNG_1PX),
        mimeType: 'image/png',
      })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(MoleculeServiceError)
    expect((error as MoleculeServiceError).message).toContain('non-JSON body')
  })
})
