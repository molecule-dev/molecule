import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider, DECISIONS_SERVICE_LIMITS } from '../provider.js'

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

const QUESTIONS = {
  department: {
    type: 'choice' as const,
    instructions: 'Which team?',
    criteria: { billing: 'invoices', tech: 'bugs' },
  },
}
const RESULT = {
  answers: {
    department: {
      type: 'choice',
      confidence: 0.9,
      choice: 'tech',
      probabilities: { billing: 0.1, tech: 0.9 },
    },
  },
}

describe('api-ai-decisions-molecule', () => {
  it('posts state + questions to ai-decisions/decide and returns the DecideResult', async () => {
    const fetchMock = stubFetch(200, RESULT)
    const result = await createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    }).decide({ state: 'ticket body', questions: QUESTIONS, minConfidence: 0.6 })
    expect(result).toEqual(RESULT)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:1/api/v1/services/ai-decisions/decide')
    expect(JSON.parse(String(init.body))).toEqual({
      state: 'ticket body',
      questions: QUESTIONS,
      minConfidence: 0.6,
    })
  })

  it('never forwards DecideInput.model', async () => {
    const fetchMock = stubFetch(200, RESULT)
    await createProvider({ apiKey: 'mk_test' }).decide({
      state: 'x',
      questions: QUESTIONS,
      model: 'jev-latest',
    } as never)
    expect(
      JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)),
    ).not.toHaveProperty('model')
  })

  it('refuses oversized input locally, before any request', async () => {
    const fetchMock = stubFetch(200, RESULT)
    const provider = createProvider({ apiKey: 'mk_test' })
    await expect(
      provider.decide({
        state: 'x'.repeat(DECISIONS_SERVICE_LIMITS.maxStateChars + 1),
        questions: QUESTIONS,
      }),
    ).rejects.toMatchObject({ status: 413 })
    await expect(
      provider.decide({
        state: 'x',
        questions: Object.fromEntries(
          Array.from({ length: DECISIONS_SERVICE_LIMITS.maxQuestions + 1 }, (_, i) => [
            `q${i}`,
            QUESTIONS.department,
          ]),
        ),
      }),
    ).rejects.toMatchObject({ status: 413 })
    await expect(provider.decide({ state: 'x', questions: {} })).rejects.toMatchObject({
      status: 400,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws MoleculeServiceError without a key, before any request', async () => {
    const fetchMock = stubFetch(200, RESULT)
    const old = process.env.MOLECULE_API_KEY
    delete process.env.MOLECULE_API_KEY
    try {
      await expect(
        createProvider({ servicesUrl: 'http://localhost:1/api/v1/services' }).decide({
          state: 'x',
          questions: QUESTIONS,
        }),
      ).rejects.toMatchObject({ status: 401 })
    } finally {
      if (old !== undefined) process.env.MOLECULE_API_KEY = old
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps an upstream 402 to MoleculeServiceError with the allowance hint', async () => {
    stubFetch(402, { error: 'allowance used', errorKey: 'broker.error.budgetExceeded' })
    await expect(
      createProvider({ apiKey: 'mk_test' }).decide({ state: 'x', questions: QUESTIONS }),
    ).rejects.toMatchObject({
      name: 'MoleculeServiceError',
      status: 402,
      errorKey: 'broker.error.budgetExceeded',
    })
  })

  it('refuses a public cleartext services URL', () => {
    expect(() =>
      createProvider({ apiKey: 'mk_test', servicesUrl: 'http://example.com/api/v1/services' }),
    ).toThrow(/must use https/)
  })
})
