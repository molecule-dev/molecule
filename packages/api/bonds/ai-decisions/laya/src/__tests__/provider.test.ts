import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, DEFAULT_LAYA_URL } from '../provider.js'
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

// The response documented in laya docs/http-api.md, plus a noul answer.
const LAYA_RESPONSE = {
  model: 'laya-rl-agent',
  answers: {
    queue: {
      type: 'choice',
      choice: 'billing',
      probabilities: { billing: 0.9281, tech: 0.0412, other: 0.0307 },
      confidence: 0.4534,
      answer_confidence: 0.9281,
      action: { act_probability: 1.0 },
    },
    urgency: {
      type: 'score',
      score: 2.6389,
      legend: { '0': 'calm', '1': 'firm', '2': 'angry', '3': 'furious' },
      probabilities: { '0': 0.0099, '1': 0.0713, '2': 0.536, '3': 0.3828 },
      confidence: 0.3542,
      answer_confidence: 0.536,
      action: { act_probability: 1.0 },
    },
    refund: { type: 'noul', noul: 0.12, confidence: 0.88, answer_confidence: 0.88 },
  },
  usage: { input_tokens: 74, output_tokens: 0 },
  routing: { model: 'english', repo: 'convaiinnovations/laya', reason: 'English Latin text' },
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

describe('ai-decisions-laya', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
    vi.stubEnv('LAYA_URL', '')
    vi.stubEnv('LAYA_API_KEY', '')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('maps yesNo to noul and criteria yes/no to true/false on the wire', () => {
    expect(toWireQuestions(QUESTIONS)).toEqual({
      queue: QUESTIONS.queue,
      urgency: QUESTIONS.urgency,
      refund: {
        type: 'noul',
        instructions: 'The customer wants a refund.',
        criteria: { true: 'asks for money back' },
      },
    })
    expect(toWireQuestions({ q: { type: 'yesNo', instructions: 'x' } })).toEqual({
      q: { type: 'noul', instructions: 'x' },
    })
  })

  it('POSTs /v1/systemone to the default port with no auth header when no key is set', async () => {
    mockFetch.mockResolvedValueOnce(ok(LAYA_RESPONSE))
    await createProvider({ baseUrl: undefined }).decide({
      state: 'charged twice',
      questions: QUESTIONS,
    })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(url).toBe(`${DEFAULT_LAYA_URL}/v1/systemone`)
    expect(init.method).toBe('POST')
    expect(init.headers.authorization).toBeUndefined()
    const body = JSON.parse(init.body)
    expect(body).toEqual({ state: 'charged twice', questions: toWireQuestions(QUESTIONS) })
  })

  it('sends the bearer key, base URL and checkpoint from config', async () => {
    mockFetch.mockResolvedValueOnce(ok(LAYA_RESPONSE))
    await createProvider({
      baseUrl: 'http://laya:9000/',
      apiKey: 'k',
      model: 'multilingual',
    }).decide({
      state: { body: 'hola' },
      questions: QUESTIONS,
    })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(url).toBe('http://laya:9000/v1/systemone')
    expect(init.headers.authorization).toBe('Bearer k')
    expect(JSON.parse(init.body).model).toBe('multilingual')
  })

  it('reads LAYA_URL / LAYA_API_KEY from the environment', async () => {
    vi.stubEnv('LAYA_URL', 'http://env-host:8000')
    vi.stubEnv('LAYA_API_KEY', 'envkey')
    mockFetch.mockResolvedValueOnce(ok(LAYA_RESPONSE))
    await createProvider().decide({ state: 's', questions: QUESTIONS })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(url).toBe('http://env-host:8000/v1/systemone')
    expect(init.headers.authorization).toBe('Bearer envkey')
  })

  it('normalizes the documented response into typed answers', async () => {
    mockFetch.mockResolvedValueOnce(ok(LAYA_RESPONSE))
    const r = await createProvider().decide({
      state: 's',
      questions: QUESTIONS,
      minConfidence: 0.6,
    })
    expect(r.model).toBe('laya-rl-agent')
    expect(r.usage).toEqual({ inputTokens: 74, outputTokens: 0 })
    expect(r.answers.queue).toEqual({
      type: 'choice',
      choice: 'billing',
      probabilities: { billing: 0.9281, tech: 0.0412, other: 0.0307 },
      confidence: 0.9281,
      lowConfidence: false,
    })
    expect(r.answers.urgency).toEqual({
      type: 'score',
      score: 2.6389,
      level: 2,
      probabilities: [0.0099, 0.0713, 0.536, 0.3828],
      confidence: 0.536,
      lowConfidence: true,
    })
    expect(r.answers.refund).toEqual({
      type: 'yesNo',
      probability: 0.12,
      answer: false,
      confidence: 0.88,
      lowConfidence: false,
    })
  })

  it('omits lowConfidence when no threshold is passed', async () => {
    mockFetch.mockResolvedValueOnce(ok(LAYA_RESPONSE))
    const r = await createProvider().decide({ state: 's', questions: QUESTIONS })
    expect('lowConfidence' in r.answers.queue).toBe(false)
  })

  it('retries a busy 503 and succeeds', async () => {
    vi.useFakeTimers()
    try {
      mockFetch
        .mockResolvedValueOnce(
          fail(503, '{"detail":"server busy, try again later"}', { 'retry-after': '1' }),
        )
        .mockResolvedValueOnce(ok(LAYA_RESPONSE))
      const p = createProvider().decide({ state: 's', questions: QUESTIONS })
      await vi.advanceTimersByTimeAsync(1000)
      const r = await p
      expect(r.answers.queue.choice).toBe('billing')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('surfaces the server detail and status on a 422', async () => {
    mockFetch.mockResolvedValueOnce(
      fail(422, '{"detail":"question \'queue\': options exceed head budget"}'),
    )
    await expect(
      createProvider().decide({ state: 's', questions: QUESTIONS }),
    ).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining('options exceed head budget'),
    })
  })

  it('throws when an answer is missing', async () => {
    mockFetch.mockResolvedValueOnce(ok({ answers: {} }))
    await expect(createProvider().decide({ state: 's', questions: QUESTIONS })).rejects.toThrow(
      /no answer for question "queue"/,
    )
  })

  it('rejects a missing state before calling the server', async () => {
    await expect(
      createProvider().decide({ state: null as unknown as string, questions: QUESTIONS }),
    ).rejects.toThrow(/requires a `state`/)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('refuses images instead of answering from the text alone', async () => {
    await expect(
      createProvider().decide({
        state: 's',
        questions: QUESTIONS,
        images: [{ mimeType: 'image/png', data: 'iVBORw0KGgo=' }],
      }),
    ).rejects.toThrow(/reads text only/)
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
