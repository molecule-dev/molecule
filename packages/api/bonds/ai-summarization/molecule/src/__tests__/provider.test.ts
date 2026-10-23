import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider, SUMMARIZATION_SERVICE_LIMITS } from '../provider.js'

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

const RESULT = {
  summary: 'One tight sentence.',
  withinCap: true,
  attempts: 1,
  usage: { inputTokens: 42, outputTokens: 7 },
}

describe('api-ai-summarization-molecule', () => {
  it('posts the text and its controls to summarization/summarize and returns the SummarizeResult', async () => {
    const fetchMock = stubFetch(200, RESULT)
    const result = await createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    }).summarize({ text: 'a long article', format: 'tldr', maxWords: 25, focus: 'the numbers' })
    expect(result).toEqual(RESULT)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:1/api/v1/services/summarization/summarize')
    expect(JSON.parse(String(init.body))).toEqual({
      text: 'a long article',
      format: 'tldr',
      maxWords: 25,
      focus: 'the numbers',
    })
  })

  it('never forwards SummarizeInput.model or .provider', async () => {
    const fetchMock = stubFetch(200, RESULT)
    await createProvider({ apiKey: 'mk_test' }).summarize({
      text: 'x',
      model: 'jev-latest',
      provider: 'openai',
    } as never)
    const body = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))
    expect(body).not.toHaveProperty('model')
    expect(body).not.toHaveProperty('provider')
  })

  it('refuses oversized input locally, before any request', async () => {
    const fetchMock = stubFetch(200, RESULT)
    const provider = createProvider({ apiKey: 'mk_test' })
    await expect(
      provider.summarize({ text: 'x'.repeat(SUMMARIZATION_SERVICE_LIMITS.maxTextChars + 1) }),
    ).rejects.toMatchObject({ status: 413 })
    await expect(provider.summarize({ text: 'x', maxWords: 0 })).rejects.toMatchObject({
      status: 400,
    })
    await expect(
      provider.summarize({ text: 'x', maxWords: SUMMARIZATION_SERVICE_LIMITS.maxWords + 1 }),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      provider.summarize({ text: 'x', sentences: SUMMARIZATION_SERVICE_LIMITS.maxSentences + 1 }),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      provider.summarize({ text: 'x', attempts: SUMMARIZATION_SERVICE_LIMITS.maxAttempts + 1 }),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      provider.summarize({
        text: 'x',
        focus: 'f'.repeat(SUMMARIZATION_SERVICE_LIMITS.maxFocusChars + 1),
      }),
    ).rejects.toMatchObject({ status: 400 })
    await expect(provider.summarize({ text: 'x', format: 'haiku' as never })).rejects.toMatchObject(
      { status: 400 },
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses an empty text locally', async () => {
    stubFetch(200, RESULT)
    await expect(
      createProvider({ apiKey: 'mk_test' }).summarize({ text: '' }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('carries the status and errorKey of a service refusal', async () => {
    stubFetch(402, { error: 'allowance used up', errorKey: 'hostedServices.error.allowance' })
    const provider = createProvider({ apiKey: 'mk_test' })
    await expect(provider.summarize({ text: 'x' })).rejects.toMatchObject({
      name: 'MoleculeServiceError',
      status: 402,
      errorKey: 'hostedServices.error.allowance',
    })
  })

  it('refuses a missing key before any request', async () => {
    const fetchMock = stubFetch(200, RESULT)
    await expect(createProvider({ apiKey: '' }).summarize({ text: 'x' })).rejects.toMatchObject({
      status: 401,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses a public cleartext services URL', () => {
    expect(() =>
      createProvider({ apiKey: 'k', servicesUrl: 'http://api.example.com/api/v1/services' }),
    ).toThrow(/must use https/)
  })

  it('allows loopback http for a local services instance', async () => {
    const fetchMock = stubFetch(200, RESULT)
    await createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://127.0.0.1:4310/api/v1/services',
    }).summarize({ text: 'x' })
    expect(String((fetchMock.mock.calls[0] as [string, RequestInit])[0])).toBe(
      'http://127.0.0.1:4310/api/v1/services/summarization/summarize',
    )
  })
})
