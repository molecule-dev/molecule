import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, DEFAULT_INTERN_DECISION_URL, provider } from '../provider.js'
import { aiDecisionsInternDecisionSecretDefinitions } from '../secrets.js'
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

// Shaped like the service's output (src/inference/engine.py `predict` +
// pipeline.py `predict`): answers under `answers`, noul probabilities keyed
// no/yes with `noul` = P(yes), score keyed "0".."k-1", plus source/decision.
const ID_RESPONSE = {
  answers: {
    queue: {
      type: 'choice',
      probabilities: { billing: 0.88, tech: 0.08, other: 0.04 },
      confidence: 0.88,
      choice: 'billing',
      source: 'local',
      decision: 'billing',
    },
    urgency: {
      type: 'score',
      probabilities: { '0': 0.1, '1': 0.6, '2': 0.2, '3': 0.1 },
      confidence: 0.6,
      score: 1.3,
      legend: { '0': 'calm', '1': 'firm', '2': 'angry', '3': 'furious' },
      source: 'local',
      decision: '1',
    },
    refund: {
      type: 'noul',
      probabilities: { no: 0.3, yes: 0.7 },
      confidence: 0.7,
      noul: 0.7,
      source: 'local',
      decision: 'yes',
    },
  },
  usage: { input_tokens: 301, output_tokens: 3, decision_count: 3 },
  timing: { inference_ms: 33.2, queue_ms: 0.1, server_ms: 34.0 },
  model: 'intern-decision',
  request_id: '0123456789abcdef0123456789abcdef',
  thinking: { enabled: false, confidence_threshold: 0.7, tasks: [] },
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
    criteria: { yes: 'asks for money back', no: 'no money requested' },
  },
}

describe('ai-decisions-intern-decision', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
    vi.stubEnv('INTERN_DECISION_URL', '')
    vi.stubEnv('INTERN_DECISION_API_KEY', '')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('POSTs /v1/decisions on port 7860 with no model and no auth by default', async () => {
    mockFetch.mockResolvedValueOnce(ok(ID_RESPONSE))
    await createProvider().decide({ state: 'charged twice', questions: QUESTIONS, model: 'x' })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(url).toBe(`${DEFAULT_INTERN_DECISION_URL}/v1/decisions`)
    expect(url).toBe('http://127.0.0.1:7860/v1/decisions')
    expect(init.method).toBe('POST')
    expect(init.headers['content-type']).toBe('application/json')
    expect(init.headers.authorization).toBeUndefined()
    expect(JSON.parse(init.body)).toEqual({
      state: 'charged twice',
      questions: toWireQuestions(QUESTIONS),
    })
  })

  it('sends a proxy bearer key and base URL from config', async () => {
    mockFetch.mockResolvedValueOnce(ok(ID_RESPONSE))
    await createProvider({ baseUrl: 'https://decide.internal/', apiKey: 'k' }).decide({
      state: { body: 'x' },
      questions: QUESTIONS,
    })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(url).toBe('https://decide.internal/v1/decisions')
    expect(init.headers.authorization).toBe('Bearer k')
  })

  it('reads INTERN_DECISION_URL / INTERN_DECISION_API_KEY from the environment', async () => {
    vi.stubEnv('INTERN_DECISION_URL', 'http://gpu-box:7860')
    vi.stubEnv('INTERN_DECISION_API_KEY', 'envkey')
    mockFetch.mockResolvedValueOnce(ok(ID_RESPONSE))
    await createProvider().decide({ state: 's', questions: QUESTIONS })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(url).toBe('http://gpu-box:7860/v1/decisions')
    expect(init.headers.authorization).toBe('Bearer envkey')
  })

  it('normalizes the response into typed answers', async () => {
    mockFetch.mockResolvedValueOnce(ok(ID_RESPONSE))
    const r = await createProvider().decide({
      state: 's',
      questions: QUESTIONS,
      minConfidence: 0.75,
    })
    expect(r.model).toBe('intern-decision')
    expect(r.usage).toEqual({ inputTokens: 301, outputTokens: 3 })
    expect(r.answers.queue).toEqual({
      type: 'choice',
      choice: 'billing',
      probabilities: { billing: 0.88, tech: 0.08, other: 0.04 },
      confidence: 0.88,
      lowConfidence: false,
    })
    expect(r.answers.urgency).toEqual({
      type: 'score',
      score: 1.3,
      level: 1,
      probabilities: [0.1, 0.6, 0.2, 0.1],
      confidence: 0.6,
      lowConfidence: true,
    })
    expect(r.answers.refund).toEqual({
      type: 'yesNo',
      probability: 0.7,
      answer: true,
      confidence: 0.7,
      lowConfidence: true,
    })
  })

  it('sends images as { type, data } with raw base64', async () => {
    mockFetch.mockResolvedValueOnce(ok(ID_RESPONSE))
    await createProvider().decide({
      state: 's',
      questions: QUESTIONS,
      images: [
        { mimeType: 'image/png', data: 'iVBORw0KGgo=' },
        { mimeType: 'image/jpeg', data: '/9j/4AAQ' },
      ],
    })
    expect(JSON.parse(mockFetch.mock.calls[0]![1].body).images).toEqual([
      { type: 'image/png', data: 'iVBORw0KGgo=' },
      { type: 'image/jpeg', data: '/9j/4AAQ' },
    ])
  })

  it('refuses over-limit questions, options and images before calling the server', async () => {
    const p = createProvider()
    const many = Object.fromEntries(
      Array.from({ length: 17 }, (_, i) => [
        `q${i}`,
        { type: 'yesNo' as const, instructions: 'x' },
      ]),
    )
    await expect(p.decide({ state: 's', questions: many })).rejects.toThrow(/at most 16/)
    const criteria = Object.fromEntries(Array.from({ length: 63 }, (_, i) => [`o${i}`, `o${i}`]))
    await expect(
      p.decide({ state: 's', questions: { q: { type: 'choice', instructions: 'x', criteria } } }),
    ).rejects.toThrow(/63 options; Intern-Decision answers 1–62/)
    const img = { mimeType: 'image/png', data: 'iVBORw0KGgo=' }
    await expect(
      p.decide({ state: 's', questions: QUESTIONS, images: Array.from({ length: 9 }, () => img) }),
    ).rejects.toThrow(/at most 8/)
    await expect(
      p.decide({
        state: 's',
        questions: QUESTIONS,
        images: [{ mimeType: 'image/bmp', data: 'Qk0=' }],
      }),
    ).rejects.toThrow(/image\/bmp" is not supported/)
    await expect(
      p.decide({
        state: 's',
        questions: QUESTIONS,
        images: [{ mimeType: 'image/png', data: 'A'.repeat(17 * 1024 * 1024) }],
      }),
    ).rejects.toThrow(/1 byte to 12 MB/)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('retries a not-ready 503 and succeeds', async () => {
    vi.useFakeTimers()
    try {
      mockFetch
        .mockResolvedValueOnce(fail(503, '{"detail":"Inference is not ready."}'))
        .mockResolvedValueOnce(ok(ID_RESPONSE))
      const pending = createProvider().decide({ state: 's', questions: QUESTIONS })
      await vi.advanceTimersByTimeAsync(300)
      const r = await pending
      expect(r.answers.queue.choice).toBe('billing')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('surfaces a 422 with its status and detail, without retrying', async () => {
    mockFetch.mockResolvedValueOnce(fail(422, '{"detail":"Supply 1–16 questions."}'))
    await expect(
      createProvider().decide({ state: 's', questions: QUESTIONS }),
    ).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining('Supply 1–16 questions.'),
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
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

  it('exposes a lazy provider named "intern-decision" and registers its secrets', () => {
    expect(provider.name).toBe('intern-decision')
    expect(typeof provider.decide).toBe('function')
    expect(aiDecisionsInternDecisionSecretDefinitions.map((s) => s.key)).toEqual([
      'INTERN_DECISION_URL',
      'INTERN_DECISION_API_KEY',
    ])
  })
  it('resolves the headers hook before each request and merges it over the defaults', async () => {
    mockFetch.mockResolvedValueOnce(ok(ID_RESPONSE))
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
