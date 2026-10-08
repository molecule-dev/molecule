import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createProvider,
  DEFAULT_LIQUID_D1_MODEL,
  DEFAULT_LIQUID_D1_URL,
  HOSTED_LIQUID_D1_PATH,
  provider,
} from '../provider.js'

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

// Answer shapes as documented at docs.liquid.ai/lfm/models/d1 (the verbatim
// docs example, with the score answer cut to the question's three levels).
// Vendor `confidence` fields are present and must be ignored.
const D1_RESPONSE = {
  model: 'd1',
  answers: {
    refund: { type: 'noul', noul: 0.999 },
    team: {
      type: 'choice',
      choice: 'billing',
      probabilities: { billing: 0.9997, technical: 0.0002, fraud: 0.0001 },
      confidence: 0.9996,
    },
    urgency: {
      type: 'score',
      score: 2.9995,
      confidence: 0.9995,
      probabilities: { '0': 0.00001, '1': 0.00002, '2': 0.9996 },
      legend: { '0': 'Can wait', '1': 'Today', '2': 'Blocking the customer now' },
    },
  },
  usage: { input_tokens: 84, output_tokens: 0 },
}

const QUESTIONS = {
  refund: { type: 'yesNo' as const, instructions: 'Is the customer asking for a refund?' },
  team: {
    type: 'choice' as const,
    instructions: 'Which team should handle this?',
    criteria: {
      billing: 'Charges, refunds, invoices',
      technical: 'App or site faults',
      fraud: 'Suspected unauthorised use',
    },
  },
  urgency: {
    type: 'score' as const,
    instructions: 'How urgent is this?',
    criteria: ['Can wait', 'Today', 'Blocking the customer now'],
  },
}

describe('ai-decisions-liquid-d1', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
    vi.stubEnv('LIQUID_API_KEY', '')
    vi.stubEnv('LIQUID_DECISIONS_URL', '')
    vi.stubEnv('LIQUID_BASE_URL', '')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('refuses to call the hosted API without an API key', async () => {
    await expect(createProvider().decide({ state: 's', questions: QUESTIONS })).rejects.toThrow(
      /LIQUID_API_KEY/,
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('POSTs the hosted wire shape with bearer auth and the default model', async () => {
    vi.stubEnv('LIQUID_API_KEY', 'liquid-key')
    mockFetch.mockResolvedValueOnce(ok(D1_RESPONSE))
    await createProvider().decide({ state: { body: 'charged twice' }, questions: QUESTIONS })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(url).toBe(`${DEFAULT_LIQUID_D1_URL}${HOSTED_LIQUID_D1_PATH}`)
    expect(init.headers.authorization).toBe('Bearer liquid-key')
    expect(init.headers['content-type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({
      model: DEFAULT_LIQUID_D1_MODEL,
      state: { body: 'charged twice' },
      questions: {
        refund: { type: 'noul', instructions: 'Is the customer asking for a refund?' },
        team: QUESTIONS.team,
        urgency: QUESTIONS.urgency,
      },
    })
  })

  it('lets a per-call model and a gateway base URL override win (hosted path kept)', async () => {
    mockFetch.mockResolvedValueOnce(ok(D1_RESPONSE))
    await createProvider({ apiKey: 'k', baseUrl: 'https://gw.example/' }).decide({
      state: 's',
      questions: { refund: QUESTIONS.refund },
      model: 'd1:free',
    })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(url).toBe(`https://gw.example${HOSTED_LIQUID_D1_PATH}`)
    expect(JSON.parse(init.body).model).toBe('d1:free')
  })

  it('targets a self-hosted llama-server at /v1/systemone with no key needed', async () => {
    mockFetch.mockResolvedValueOnce(ok(D1_RESPONSE))
    await createProvider({ decisionsUrl: 'http://127.0.0.1:8080/' }).decide({
      state: 's',
      questions: QUESTIONS,
    })
    const [url, init] = mockFetch.mock.calls[0]!
    expect(url).toBe('http://127.0.0.1:8080/v1/systemone')
    expect(init.headers.authorization).toBeUndefined()
  })

  it('still sends the bearer token to an authenticating proxy in front of a self-hosted server', async () => {
    mockFetch.mockResolvedValueOnce(ok(D1_RESPONSE))
    await createProvider({
      decisionsUrl: 'http://10.0.0.5:8080',
      apiKey: 'proxy-token',
    }).decide({ state: 's', questions: QUESTIONS })
    const [, init] = mockFetch.mock.calls[0]!
    expect(init.headers.authorization).toBe('Bearer proxy-token')
  })

  it('honours LIQUID_DECISIONS_URL from the environment', async () => {
    vi.stubEnv('LIQUID_DECISIONS_URL', 'http://192.168.1.10:8080')
    mockFetch.mockResolvedValueOnce(ok(D1_RESPONSE))
    await createProvider().decide({ state: 's', questions: QUESTIONS })
    expect(mockFetch.mock.calls[0]![0]).toBe('http://192.168.1.10:8080/v1/systemone')
  })

  it('sends images as {content_type, base64} alongside the state', async () => {
    vi.stubEnv('LIQUID_API_KEY', 'liquid-key')
    mockFetch.mockResolvedValueOnce(ok(D1_RESPONSE))
    await createProvider().decide({
      state: 'A photo of the receipt.',
      questions: QUESTIONS,
      images: [{ mimeType: 'image/jpeg', data: 'ZmFrZQ==' }],
    })
    expect(JSON.parse(mockFetch.mock.calls[0]![1].body).images).toEqual([
      { content_type: 'image/jpeg', base64: 'ZmFrZQ==' },
    ])
  })

  it("refuses images for the text-only 'd1:free' model before any request", async () => {
    await expect(
      createProvider({ apiKey: 'k', model: 'd1:free' }).decide({
        state: 's',
        questions: QUESTIONS,
        images: [{ mimeType: 'image/png', data: 'iVBORw0KGgo=' }],
      }),
    ).rejects.toThrow(/d1:free.*does not accept images/)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('refuses what the API would 4xx: too many images, wrong type, empty data', async () => {
    const provider = createProvider({ apiKey: 'k' })
    const images = Array.from({ length: 9 }, () => ({
      mimeType: 'image/png',
      data: 'aGk=',
    }))
    await expect(provider.decide({ state: 's', questions: QUESTIONS, images })).rejects.toThrow(
      /at most 8/,
    )
    await expect(
      provider.decide({
        state: 's',
        questions: QUESTIONS,
        images: [{ mimeType: 'image/bmp', data: 'aGk=' }],
      }),
    ).rejects.toThrow(/image\/bmp/)
    await expect(
      provider.decide({
        state: 's',
        questions: QUESTIONS,
        images: [{ mimeType: 'image/png', data: '' }],
      }),
    ).rejects.toThrow(/base64 `data`/)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('refuses score questions outside 2–10 levels before any request', async () => {
    await expect(
      createProvider({ apiKey: 'k' }).decide({
        state: 's',
        questions: {
          one: { type: 'score', instructions: 'How?', criteria: ['only level'] },
        },
      }),
    ).rejects.toThrow(/2–10/)
    await expect(
      createProvider({ apiKey: 'k' }).decide({
        state: 's',
        questions: {
          many: {
            type: 'score',
            instructions: 'How?',
            criteria: Array.from({ length: 11 }, (_, i) => `level ${i}`),
          },
        },
      }),
    ).rejects.toThrow(/2–10/)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('normalizes answers and computes confidence from the distribution, not d1’s field', async () => {
    mockFetch.mockResolvedValueOnce(ok(D1_RESPONSE))
    const r = await createProvider({ apiKey: 'k' }).decide({ state: 's', questions: QUESTIONS })
    expect(r.model).toBe('d1')
    expect(r.usage).toEqual({ inputTokens: 84, outputTokens: 0 })
    expect(r.answers.refund).toEqual({
      type: 'yesNo',
      probability: 0.999,
      answer: true,
      confidence: 0.999,
    })
    expect(r.answers.team).toMatchObject({ choice: 'billing', confidence: 0.9997 })
    expect(r.answers.urgency).toMatchObject({
      score: 2.9995,
      level: 2,
      probabilities: [0.00001, 0.00002, 0.9996],
      confidence: 0.9996,
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
        .mockResolvedValueOnce(ok(D1_RESPONSE))
      const p = createProvider({ apiKey: 'k' }).decide({ state: 's', questions: QUESTIONS })
      await vi.advanceTimersByTimeAsync(300)
      await expect(p).resolves.toBeTruthy()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('resolves the headers hook before each request and merges it over the defaults', async () => {
    vi.stubEnv('LIQUID_API_KEY', 'liquid-key')
    mockFetch.mockResolvedValueOnce(ok(D1_RESPONSE))
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

  it('exposes the lazy provider proxy with its name', () => {
    expect(provider.name).toBe('liquid-d1')
  })
})
