import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, DEFAULT_JEV_MODEL, DEFAULT_JEV_URL } from '../provider.js'

const mockFetch = vi.fn()

const ok = (body: unknown): Record<string, unknown> => ({
  ok: true,
  status: 200,
  headers: new Headers(),
  json: vi.fn().mockResolvedValue(body),
})

const fail = (status: number, body: string): Record<string, unknown> => ({
  ok: false,
  status,
  headers: new Headers(),
  text: vi.fn().mockResolvedValue(body),
})

// Answer shapes as documented at docs.typesafe.ai/api (noul carries no confidence).
const JEV_RESPONSE = {
  model: 'jev-1.13.0',
  answers: {
    dept: {
      type: 'choice',
      choice: 'billing',
      probabilities: { billing: 0.88, tech: 0.12 },
      confidence: 0.76,
    },
    severity: {
      type: 'score',
      score: 1.05,
      legend: { '0': 'minor', '1': 'major' },
      probabilities: { '0': 0.05, '1': 0.95 },
      confidence: 0.92,
    },
    spam: { type: 'noul', noul: 0.95 },
  },
  usage: { input_tokens: 40, output_tokens: 0 },
}

const QUESTIONS = {
  dept: {
    type: 'choice' as const,
    instructions: 'Which team?',
    criteria: { billing: 'money', tech: 'bugs' },
  },
  severity: { type: 'score' as const, instructions: 'How bad?', criteria: ['minor', 'major'] },
  spam: { type: 'yesNo' as const, instructions: 'This is spam.' },
}

describe('ai-decisions-jev', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
    vi.stubEnv('TYPESAFE_API_KEY', '')
    vi.stubEnv('TYPESAFE_BASE_URL', '')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('refuses to call without an API key', async () => {
    await expect(createProvider().decide({ state: 's', questions: QUESTIONS })).rejects.toThrow(
      /TYPESAFE_API_KEY/,
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('POSTs the Jev wire shape with bearer auth and the default model', async () => {
    vi.stubEnv('TYPESAFE_API_KEY', 'ts-key')
    mockFetch.mockResolvedValueOnce(ok(JEV_RESPONSE))
    await createProvider().decide({ state: { body: 'x' }, questions: QUESTIONS })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(url).toBe(`${DEFAULT_JEV_URL}/v1/systemone`)
    expect(init.headers.authorization).toBe('Bearer ts-key')
    expect(init.headers['content-type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({
      model: DEFAULT_JEV_MODEL,
      state: { body: 'x' },
      questions: {
        dept: QUESTIONS.dept,
        severity: QUESTIONS.severity,
        spam: { type: 'noul', instructions: 'This is spam.' },
      },
    })
  })

  it('lets a per-call model and a base URL override win', async () => {
    mockFetch.mockResolvedValueOnce(ok(JEV_RESPONSE))
    await createProvider({ apiKey: 'k', baseUrl: 'https://gw.example/' }).decide({
      state: 's',
      questions: QUESTIONS,
      model: 'jev-1.13.0',
    })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(url).toBe('https://gw.example/v1/systemone')
    expect(JSON.parse(init.body).model).toBe('jev-1.13.0')
  })

  it('normalizes answers and computes confidence from the distribution, not Jev’s field', async () => {
    mockFetch.mockResolvedValueOnce(ok(JEV_RESPONSE))
    const r = await createProvider({ apiKey: 'k' }).decide({ state: 's', questions: QUESTIONS })
    expect(r.model).toBe('jev-1.13.0')
    expect(r.usage).toEqual({ inputTokens: 40, outputTokens: 0 })
    expect(r.answers.dept).toMatchObject({ choice: 'billing', confidence: 0.88 })
    expect(r.answers.severity).toMatchObject({
      score: 1.05,
      level: 1,
      probabilities: [0.05, 0.95],
      confidence: 0.95,
    })
    expect(r.answers.spam).toEqual({
      type: 'yesNo',
      probability: 0.95,
      answer: true,
      confidence: 0.95,
    })
  })

  it('throws immediately on 401 with the status attached', async () => {
    mockFetch.mockResolvedValueOnce(fail(401, '{"error":{"message":"invalid api key"}}'))
    await expect(
      createProvider({ apiKey: 'bad' }).decide({ state: 's', questions: QUESTIONS }),
    ).rejects.toMatchObject({
      status: 401,
      message: expect.stringContaining('invalid api key'),
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries 529 overloaded', async () => {
    vi.useFakeTimers()
    try {
      mockFetch
        .mockResolvedValueOnce(fail(529, 'overloaded'))
        .mockResolvedValueOnce(ok(JEV_RESPONSE))
      const p = createProvider({ apiKey: 'k' }).decide({ state: 's', questions: QUESTIONS })
      await vi.advanceTimersByTimeAsync(300)
      await expect(p).resolves.toBeTruthy()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('refuses images instead of answering from the text alone', async () => {
    await expect(
      createProvider({ apiKey: 'k' }).decide({
        state: 's',
        questions: QUESTIONS,
        images: [{ mimeType: 'image/png', data: 'iVBORw0KGgo=' }],
      }),
    ).rejects.toThrow(/reads text only/)
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
