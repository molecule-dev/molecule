import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createProvider,
  DEFAULT_KEV_MODEL,
  DEFAULT_KEV_TIMEOUT_MS,
  DEFAULT_KEV_URL,
  provider,
} from '../provider.js'
import { aiDecisionsKevSecretDefinitions } from '../secrets.js'
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

// Shaped like kev.serve's response (kev/api.py `to_answers` + `Server._body`):
// score probabilities and legend keyed "0".."k-1", noul = P(true) with no
// probabilities or confidence, TypeSafe-style dispersion `confidence`.
const KEV_RESPONSE = {
  model: 'kev-latest',
  answers: {
    queue: {
      type: 'choice',
      choice: 'billing',
      confidence: 0.865,
      probabilities: { billing: 0.91, tech: 0.06, other: 0.03 },
    },
    urgency: {
      type: 'score',
      score: 2.2,
      confidence: 0.41,
      legend: { '0': 'calm', '1': 'firm', '2': 'angry', '3': 'furious' },
      probabilities: { '0': 0.05, '1': 0.15, '2': 0.35, '3': 0.45 },
    },
    refund: { type: 'noul', noul: 0.93 },
  },
  usage: { input_tokens: 101, output_tokens: 161 },
  latency_ms: 495,
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
    criteria: { yes: 'asks for money back', no: 'only reports a problem' },
  },
}

describe('ai-decisions-kev', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
    vi.stubEnv('KEV_URL', '')
    vi.stubEnv('KEV_API_KEY', '')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('POSTs /v1/systemone to port 8008 with kev-latest and no auth when no key is set', async () => {
    mockFetch.mockResolvedValueOnce(ok(KEV_RESPONSE))
    await createProvider().decide({ state: 'charged twice', questions: QUESTIONS })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(DEFAULT_KEV_URL).toBe('http://localhost:8008')
    expect(url).toBe('http://localhost:8008/v1/systemone')
    expect(init.method).toBe('POST')
    expect(init.headers['content-type']).toBe('application/json')
    expect(init.headers.authorization).toBeUndefined()
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(JSON.parse(init.body)).toEqual({
      model: DEFAULT_KEV_MODEL,
      state: 'charged twice',
      questions: toWireQuestions(QUESTIONS),
    })
  })

  it('maps yesNo to noul with "true"/"false" criteria keys', () => {
    expect(toWireQuestions({ r: QUESTIONS.refund })).toEqual({
      r: {
        type: 'noul',
        instructions: 'The customer wants a refund.',
        criteria: { true: 'asks for money back', false: 'only reports a problem' },
      },
    })
  })

  it('sends the bearer key, base URL and model from config; a per-call model wins', async () => {
    mockFetch.mockResolvedValue(ok(KEV_RESPONSE))
    const p = createProvider({ baseUrl: 'http://gpu:8009/', apiKey: 'k', model: 'jev-latest' })
    await p.decide({ state: { body: 'x' }, questions: QUESTIONS })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(url).toBe('http://gpu:8009/v1/systemone')
    expect(init.headers.authorization).toBe('Bearer k')
    expect(JSON.parse(init.body).model).toBe('jev-latest')
    await p.decide({ state: 'x', questions: QUESTIONS, model: 'nimble-latest' })
    expect(JSON.parse(mockFetch.mock.calls[1]![1].body).model).toBe('nimble-latest')
  })

  it('reads KEV_URL / KEV_API_KEY from the environment at construction, not import', async () => {
    vi.stubEnv('KEV_URL', 'https://ws--kev-api.modal.run')
    vi.stubEnv('KEV_API_KEY', 'envkey')
    mockFetch.mockResolvedValueOnce(ok(KEV_RESPONSE))
    await createProvider().decide({ state: 's', questions: QUESTIONS })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(url).toBe('https://ws--kev-api.modal.run/v1/systemone')
    expect(init.headers.authorization).toBe('Bearer envkey')
  })

  it('normalizes the response into typed answers, ignoring the wire confidence', async () => {
    mockFetch.mockResolvedValueOnce(ok(KEV_RESPONSE))
    const r = await createProvider().decide({
      state: 's',
      questions: QUESTIONS,
      minConfidence: 0.6,
    })
    expect(r.model).toBe('kev-latest')
    expect(r.usage).toEqual({ inputTokens: 101, outputTokens: 161 })
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

  it('accepts up to 255 choice options and refuses 256 before calling the server', async () => {
    const make = (n: number): Record<string, string> =>
      Object.fromEntries(Array.from({ length: n }, (_, i) => [`o${i}`, `option ${i}`]))
    mockFetch.mockResolvedValueOnce(
      ok({ answers: { q: { type: 'choice', choice: 'o0', probabilities: { o0: 1 } } } }),
    )
    const r = await createProvider().decide({
      state: 's',
      questions: { q: { type: 'choice', instructions: 'Pick', criteria: make(255) } },
    })
    expect(r.answers.q.choice).toBe('o0')
    await expect(
      createProvider().decide({
        state: 's',
        questions: { q: { type: 'choice', instructions: 'Pick', criteria: make(256) } },
      }),
    ).rejects.toThrow(/256 options; Kev answers 1–255/)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('honours a lowered maxOptions for another /v1/systemone server', async () => {
    const levels = Array.from({ length: 27 }, (_, i) => `l${i}`)
    await expect(
      createProvider({ maxOptions: 26 }).decide({
        state: 's',
        questions: { q: { type: 'score', instructions: 'Rate', criteria: levels } },
      }),
    ).rejects.toThrow(/27 score levels; Kev answers 1–26/)
    await expect(
      createProvider().decide({
        state: 's',
        questions: { q: { type: 'score', instructions: 'Rate', criteria: [] } },
      }),
    ).rejects.toThrow(/0 score levels/)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('throws on images, which Kev cannot read', async () => {
    await expect(
      createProvider().decide({
        state: 's',
        questions: QUESTIONS,
        images: [{ mimeType: 'image/png', data: 'iVBORw0KGgo=' }],
      }),
    ).rejects.toThrow(/Kev reads text only/)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('surfaces the over-length-state 422 verbatim and never retries it', async () => {
    const detail =
      'state is 70123 tokens; the server accepts at most 65536. Set KEV_TRUNCATE_STATES=1 to read the first 65536 tokens instead.'
    mockFetch.mockResolvedValueOnce(fail(422, JSON.stringify({ detail })))
    await expect(
      createProvider().decide({ state: 'very long', questions: QUESTIONS }),
    ).rejects.toMatchObject({ status: 422, message: expect.stringContaining(detail) })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('flattens a pydantic validation 422 into a readable message', async () => {
    mockFetch.mockResolvedValueOnce(
      fail(
        422,
        JSON.stringify({
          detail: [{ loc: ['body', 'questions'], msg: 'Field required', type: 'missing' }],
        }),
      ),
    )
    await expect(
      createProvider().decide({ state: 's', questions: QUESTIONS }),
    ).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining('body.questions: Field required'),
    })
  })

  it('surfaces a 401 with its status and detail, without retrying', async () => {
    mockFetch.mockResolvedValueOnce(
      fail(
        401,
        '{"detail":"missing or invalid API key; send Authorization: Bearer <KEV_API_KEY>"}',
        { 'www-authenticate': 'Bearer' },
      ),
    )
    await expect(
      createProvider({ apiKey: 'bad' }).decide({ state: 's', questions: QUESTIONS }),
    ).rejects.toMatchObject({
      status: 401,
      message: expect.stringContaining('missing or invalid API key'),
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries a platform 503 from a cold scale-to-zero host and succeeds', async () => {
    vi.useFakeTimers()
    try {
      mockFetch
        .mockResolvedValueOnce(fail(503, 'starting', { 'retry-after': '1' }))
        .mockResolvedValueOnce(ok(KEV_RESPONSE))
      const p = createProvider().decide({ state: 's', questions: QUESTIONS })
      await vi.advanceTimersByTimeAsync(1000)
      const r = await p
      expect(r.answers.queue.choice).toBe('billing')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('defaults to a cold-start-sized timeout and honours timeoutMs + the caller signal', async () => {
    expect(DEFAULT_KEV_TIMEOUT_MS).toBeGreaterThanOrEqual(60_000)
    mockFetch.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_, reject) => {
          init.signal.addEventListener('abort', () => reject(init.signal.reason))
        }),
    )
    await expect(
      createProvider({ timeoutMs: 20 }).decide({ state: 's', questions: QUESTIONS }),
    ).rejects.toMatchObject({ name: 'TimeoutError' })
    const controller = new AbortController()
    const pending = createProvider().decide({
      state: 's',
      questions: QUESTIONS,
      signal: controller.signal,
    })
    controller.abort(new Error('caller cancelled'))
    await expect(pending).rejects.toThrow('caller cancelled')
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

  it('exposes a lazy provider named "kev" and registers its secrets', () => {
    expect(provider.name).toBe('kev')
    expect(typeof provider.decide).toBe('function')
    expect(aiDecisionsKevSecretDefinitions.map((s) => s.key)).toEqual(['KEV_URL', 'KEV_API_KEY'])
    expect(aiDecisionsKevSecretDefinitions.every((s) => s.required === false)).toBe(true)
  })

  it('resolves the headers hook before each request and merges it over the defaults', async () => {
    mockFetch.mockResolvedValueOnce(ok(KEV_RESPONSE))
    let calls = 0
    await createProvider({
      baseUrl: 'https://hosted.example/',
      headers: async () => {
        calls++
        return { 'modal-key': 'id', 'modal-secret': 'secret' }
      },
    }).decide({ state: 'charged twice', questions: QUESTIONS })
    const [, init] = mockFetch.mock.calls[0]!
    expect(calls).toBe(1)
    expect(init.headers['modal-key']).toBe('id')
    expect(init.headers['modal-secret']).toBe('secret')
    expect(init.headers['content-type']).toBe('application/json')
  })
})
