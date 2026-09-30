import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, DEFAULT_JEFF_MODEL, DEFAULT_JEFF_URL, provider } from '../provider.js'
import { aiDecisionsJeffSecretDefinitions } from '../secrets.js'
import { toWireQuestions } from '../wire.js'

const mockFetch = vi.fn()

const ok = (body: unknown): Record<string, unknown> => ({
  ok: true,
  status: 200,
  headers: new Headers(),
  json: vi.fn().mockResolvedValue(body),
})

const fail = (
  status: number,
  body: string,
  headers: Record<string, string> = {},
): Record<string, unknown> => ({
  ok: false,
  status,
  headers: new Headers(headers),
  text: vi.fn().mockResolvedValue(body),
})

// Shaped like jeff-serve's `answer()` output (src/jeff/model.py): score
// probabilities and legend keyed "0".."k-1", noul = P(true), usage.output_tokens 0.
const JEFF_RESPONSE = {
  model: 'jeff-qwen3.5-0.8b',
  answers: {
    queue: {
      type: 'choice',
      choice: 'billing',
      probabilities: { billing: 0.91, tech: 0.06, other: 0.03 },
      confidence: 0.865,
    },
    urgency: {
      type: 'score',
      score: 2.2,
      legend: { '0': 'calm', '1': 'firm', '2': 'angry', '3': 'furious' },
      probabilities: { '0': 0.05, '1': 0.15, '2': 0.35, '3': 0.45 },
      confidence: 0.41,
    },
    refund: { type: 'noul', noul: 0.93 },
  },
  usage: { input_tokens: 212, output_tokens: 0 },
}

const QUESTIONS = {
  queue: {
    type: 'choice' as const,
    instructions: 'Which team?',
    criteria: {
      billing: 'billing and refunds',
      tech: 'login and app issues',
      other: 'everything else',
    },
  },
  urgency: {
    type: 'score' as const,
    instructions: 'How urgent?',
    criteria: ['calm', 'firm', 'angry', 'furious'],
  },
  refund: {
    type: 'yesNo' as const,
    instructions: 'The customer wants a refund.',
    criteria: { yes: 'asks for money back' },
  },
}

describe('ai-decisions-jeff', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
    vi.stubEnv('JEFF_URL', '')
    vi.stubEnv('JEFF_API_KEY', '')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('POSTs /v1/systemone to the default port with the required model and no auth when no key is set', async () => {
    mockFetch.mockResolvedValueOnce(ok(JEFF_RESPONSE))
    await createProvider().decide({ state: 'charged twice', questions: QUESTIONS })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(url).toBe(`${DEFAULT_JEFF_URL}/v1/systemone`)
    expect(init.method).toBe('POST')
    expect(init.headers['content-type']).toBe('application/json')
    expect(init.headers.authorization).toBeUndefined()
    expect(JSON.parse(init.body)).toEqual({
      model: DEFAULT_JEFF_MODEL,
      state: 'charged twice',
      questions: toWireQuestions(QUESTIONS),
    })
  })

  it('sends the bearer key, base URL and model from config; a per-call model wins', async () => {
    mockFetch.mockResolvedValue(ok(JEFF_RESPONSE))
    const p = createProvider({ baseUrl: 'http://gpu:8765/', apiKey: 'k', model: 'jeff' })
    await p.decide({ state: { body: 'x' }, questions: QUESTIONS })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(url).toBe('http://gpu:8765/v1/systemone')
    expect(init.headers.authorization).toBe('Bearer k')
    expect(JSON.parse(init.body).model).toBe('jeff')
    await p.decide({ state: 'x', questions: QUESTIONS, model: 'jeff-qwen3.5-2b' })
    expect(JSON.parse(mockFetch.mock.calls[1]![1].body).model).toBe('jeff-qwen3.5-2b')
  })

  it('reads JEFF_URL / JEFF_API_KEY from the environment at construction, not import', async () => {
    vi.stubEnv('JEFF_URL', 'http://env-host:8000')
    vi.stubEnv('JEFF_API_KEY', 'envkey')
    mockFetch.mockResolvedValueOnce(ok(JEFF_RESPONSE))
    await createProvider().decide({ state: 's', questions: QUESTIONS })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(url).toBe('http://env-host:8000/v1/systemone')
    expect(init.headers.authorization).toBe('Bearer envkey')
  })

  it('normalizes the response into typed answers, ignoring the vendor confidence', async () => {
    mockFetch.mockResolvedValueOnce(ok(JEFF_RESPONSE))
    const r = await createProvider().decide({
      state: 's',
      questions: QUESTIONS,
      minConfidence: 0.6,
    })
    expect(r.model).toBe('jeff-qwen3.5-0.8b')
    expect(r.usage).toEqual({ inputTokens: 212, outputTokens: 0 })
    expect(r.answers.queue).toEqual({
      type: 'choice',
      choice: 'billing',
      probabilities: { billing: 0.91, tech: 0.06, other: 0.03 },
      confidence: 0.91,
      lowConfidence: false,
    })
    expect(r.answers.urgency).toEqual({
      type: 'score',
      score: 2.2,
      level: 3,
      probabilities: [0.05, 0.15, 0.35, 0.45],
      confidence: 0.45,
      lowConfidence: true,
    })
    expect(r.answers.refund).toEqual({
      type: 'yesNo',
      probability: 0.93,
      answer: true,
      confidence: 0.93,
      lowConfidence: false,
    })
  })

  it('refuses more than 26 choice options before calling the server', async () => {
    const criteria = Object.fromEntries(
      Array.from({ length: 27 }, (_, i) => [`o${i}`, `option ${i}`]),
    )
    await expect(
      createProvider().decide({
        state: 's',
        questions: { q: { type: 'choice', instructions: 'Pick', criteria } },
      }),
    ).rejects.toThrow(/27 options; Jeff answers 1–26/)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('honours a raised maxOptions for a checkpoint trained on more', async () => {
    mockFetch.mockResolvedValueOnce(
      ok({ answers: { q: { type: 'choice', choice: 'o0', probabilities: { o0: 1 } } } }),
    )
    const criteria = Object.fromEntries(
      Array.from({ length: 27 }, (_, i) => [`o${i}`, `option ${i}`]),
    )
    const r = await createProvider({ maxOptions: 255 }).decide({
      state: 's',
      questions: { q: { type: 'choice', instructions: 'Pick', criteria } },
    })
    expect(r.answers.q.choice).toBe('o0')
  })

  it('refuses a score outside 2–10 levels before calling the server', async () => {
    for (const criteria of [['only'], Array.from({ length: 11 }, (_, i) => `l${i}`)]) {
      await expect(
        createProvider().decide({
          state: 's',
          questions: { q: { type: 'score', instructions: 'Rate', criteria } },
        }),
      ).rejects.toThrow(/score levels; Jeff answers 2–10/)
    }
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('forwards images as data URLs and refuses more than 4 or an unsupported type', async () => {
    mockFetch.mockResolvedValueOnce(ok(JEFF_RESPONSE))
    await createProvider().decide({
      state: 's',
      questions: QUESTIONS,
      images: [{ mimeType: 'image/png', data: 'iVBORw0KGgo=' }],
    })
    expect(JSON.parse(mockFetch.mock.calls[0]![1].body).images).toEqual([
      'data:image/png;base64,iVBORw0KGgo=',
    ])
    const img = { mimeType: 'image/png', data: 'x' }
    await expect(
      createProvider().decide({
        state: 's',
        questions: QUESTIONS,
        images: [img, img, img, img, img],
      }),
    ).rejects.toThrow(/at most 4/)
    await expect(
      createProvider().decide({
        state: 's',
        questions: QUESTIONS,
        images: [{ mimeType: 'image/gif', data: 'x' }],
      }),
    ).rejects.toThrow(/image\/gif" is not supported/)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries a busy 529 (Retry-After: 1) and succeeds', async () => {
    vi.useFakeTimers()
    try {
      mockFetch
        .mockResolvedValueOnce(
          fail(529, '{"detail":"The model is busy. Retry shortly."}', { 'retry-after': '1' }),
        )
        .mockResolvedValueOnce(ok(JEFF_RESPONSE))
      const p = createProvider().decide({ state: 's', questions: QUESTIONS })
      await vi.advanceTimersByTimeAsync(1000)
      const r = await p
      expect(r.answers.queue.choice).toBe('billing')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('surfaces a 401 with its status and detail, without retrying', async () => {
    mockFetch.mockResolvedValueOnce(fail(401, '{"detail":"Missing or invalid API key."}'))
    await expect(
      createProvider({ apiKey: 'bad' }).decide({ state: 's', questions: QUESTIONS }),
    ).rejects.toMatchObject({
      status: 401,
      message: expect.stringContaining('Missing or invalid API key.'),
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('flattens a FastAPI validation 422 into a readable message', async () => {
    mockFetch.mockResolvedValueOnce(
      fail(
        422,
        JSON.stringify({
          detail: [
            {
              loc: ['body', 'model'],
              msg: 'Value error, Unknown model. Use jeff-qwen3.5-0.8b or jeff-latest.',
              type: 'value_error',
            },
          ],
        }),
      ),
    )
    await expect(
      createProvider().decide({ state: 's', questions: QUESTIONS, model: 'jev-latest' }),
    ).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining('body.model: Value error, Unknown model'),
    })
  })

  it('throws when an answer is missing', async () => {
    mockFetch.mockResolvedValueOnce(ok({ answers: {} }))
    await expect(createProvider().decide({ state: 's', questions: QUESTIONS })).rejects.toThrow(
      /no answer for question "queue"/,
    )
  })

  it('rejects a missing state or no questions before calling the server', async () => {
    await expect(
      createProvider().decide({ state: null as unknown as string, questions: QUESTIONS }),
    ).rejects.toThrow(/requires a `state`/)
    await expect(createProvider().decide({ state: 's', questions: {} })).rejects.toThrow(
      /at least one question/,
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('exposes a lazy provider named "jeff" and registers its secrets', () => {
    expect(provider.name).toBe('jeff')
    expect(typeof provider.decide).toBe('function')
    expect(aiDecisionsJeffSecretDefinitions.map((s) => s.key)).toEqual(['JEFF_URL', 'JEFF_API_KEY'])
    expect(aiDecisionsJeffSecretDefinitions.every((s) => s.required === false)).toBe(true)
  })
  it('resolves the headers hook before each request and merges it over the defaults', async () => {
    mockFetch.mockResolvedValueOnce(ok(JEFF_RESPONSE))
    let calls = 0
    await createProvider({
      baseUrl: 'https://hosted.example/',
      headers: async () => {
        calls++
        return { authorization: 'Bearer short-lived-id-token', 'x-extra': 'yes' }
      },
    }).decide({ state: 'charged twice', questions: QUESTIONS })
    const [, init] = mockFetch.mock.calls[0]!
    expect(calls).toBe(1)
    expect(init.headers.authorization).toBe('Bearer short-lived-id-token')
    expect(init.headers['x-extra']).toBe('yes')
    expect(init.headers['content-type']).toBe('application/json')
  })
})
