import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createProvider,
  IMAGE_GENERATION_SERVICE_LIMITS,
  MoleculeServiceError,
} from '../provider.js'

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

const RESULT = {
  model: 'gpt-image-1.5',
  images: [{ base64: 'aWNvbg==', revisedPrompt: 'revised' }],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api-ai-image-generation-molecule', () => {
  it('posts the prompt to image-generation/generate and returns the result', async () => {
    const fetchMock = stubFetch(200, RESULT)
    const result = await createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    }).generate({ prompt: 'a fox', n: 2, size: '1536x1024', quality: 'high' })
    expect(result.model).toBe('gpt-image-1.5')
    expect(result.images[0]?.base64).toBe('aWNvbg==')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:1/api/v1/services/image-generation/generate')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      prompt: 'a fox',
      n: 2,
      size: '1536x1024',
      quality: 'high',
    })
  })

  it('strips a provider url field from results', async () => {
    stubFetch(200, { model: 'm', images: [{ base64: 'x', url: 'https://up.test/i.png' }] })
    const { images } = await createProvider({ apiKey: 'mk_test' }).generate({ prompt: 'p' })
    expect(images[0]).not.toHaveProperty('url')
  })

  it.each([
    [{ prompt: '' }, 400],
    [{ prompt: '   ' }, 400],
    [{ prompt: 'x'.repeat(IMAGE_GENERATION_SERVICE_LIMITS.maxPromptChars + 1) }, 413],
    [{ prompt: 'p', n: 0 }, 400],
    [{ prompt: 'p', n: 5 }, 400],
    [{ prompt: 'p', n: 1.5 }, 400],
    [{ prompt: 'p', model: 'dall-e-3' }, 400],
    [{ prompt: 'p', size: '1792x1024' }, 400],
    [{ prompt: 'p', quality: 'auto' }, 400],
    [{ prompt: 'p', quality: 'hd' }, 400],
  ])('refuses %j locally, before any request', async (params, status) => {
    const fetchMock = stubFetch(200, RESULT)
    await expect(
      createProvider({ apiKey: 'mk_test' }).generate(
        params as Parameters<ReturnType<typeof createProvider>['generate']>[0],
      ),
    ).rejects.toMatchObject({ status })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws MoleculeServiceError without a key, before any request', async () => {
    const fetchMock = stubFetch(200, {})
    const old = process.env.MOLECULE_API_KEY
    delete process.env.MOLECULE_API_KEY
    try {
      await expect(
        createProvider({ servicesUrl: 'http://localhost:1/api/v1/services' }).generate({
          prompt: 'p',
        }),
      ).rejects.toMatchObject({ status: 401 })
    } finally {
      if (old !== undefined) process.env.MOLECULE_API_KEY = old
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [400, 'hostedServices.error.contentFlagged'],
    [401, 'hostedServices.error.tokenInvalid'],
    [402, 'broker.error.budgetExceeded'],
    [429, 'broker.error.rateLimited'],
  ])('maps a %i refusal to a MoleculeServiceError with the service errorKey', async (status) => {
    stubFetch(status, { error: 'refused', errorKey: 'some.key' })
    const error = await createProvider({ apiKey: 'mk_bad' })
      .generate({ prompt: 'p' })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(MoleculeServiceError)
    expect((error as MoleculeServiceError).status).toBe(status)
    expect((error as MoleculeServiceError).errorKey).toBe('some.key')
  })

  it('refuses a plain-http non-loopback services URL at construction', () => {
    expect(() => createProvider({ servicesUrl: 'http://api.example.com' })).toThrow(
      /must use https/,
    )
  })
})
