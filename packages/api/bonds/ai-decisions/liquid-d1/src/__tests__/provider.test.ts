import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DecisionQuestion } from '@molecule/api-ai-decisions'

import {
  createProvider,
  DEFAULT_LIQUID_D1_MODEL,
  DEFAULT_LIQUID_D1_URL,
  HOSTED_LIQUID_D1_PATH,
  provider,
} from '../provider.js'
import { aiDecisionsLiquidD1SecretDefinitions } from '../secrets.js'

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
  headers?: Record<string, string>,
): Record<string, unknown> => ({
  ok: false,
  status,
  headers: new Headers(headers),
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

  it('honours LIQUID_BASE_URL from the environment (gateway in front of the hosted API)', async () => {
    // The third env var the provider reads — the gateway override for the
    // HOSTED path (LIQUID_DECISIONS_URL replaces the hosted API entirely, this
    // one keeps /decisions/v1/systemone). Trailing slashes are stripped.
    vi.stubEnv('LIQUID_API_KEY', 'liquid-key')
    vi.stubEnv('LIQUID_BASE_URL', 'https://liquid-gateway.example//')
    mockFetch.mockResolvedValueOnce(ok(D1_RESPONSE))
    await createProvider().decide({ state: 's', questions: QUESTIONS })
    expect(mockFetch.mock.calls[0]![0]).toBe(
      'https://liquid-gateway.example/decisions/v1/systemone',
    )
  })

  it('registers every env var the provider reads with the secrets registry', () => {
    // The boot-time configuration report is built from the registered
    // definitions alone, so an env var the bond honours but does not register
    // is invisible to it — exactly how LIQUID_BASE_URL went missing while its
    // two siblings (LTX_BASE_URL, KANDINSKY_BASE_URL) were declared. Pin the
    // whole declared set so the next env var cannot skip the registry.
    expect(aiDecisionsLiquidD1SecretDefinitions.map((d) => [d.key, d.required])).toEqual([
      ['LIQUID_API_KEY', false],
      ['LIQUID_BASE_URL', false],
      ['LIQUID_DECISIONS_URL', false],
    ])
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

  it('sends and returns a question whose id is "__proto__" instead of dropping it', async () => {
    // Plain `out[id] = …` assignment routes the key "__proto__" through the
    // inherited prototype setter, so the question silently never reaches the
    // provider and the call dies with a misleading "no answer for question"
    // error. Externally-defined question ids (e.g. a rules engine passing
    // ids parsed from JSON) can be any string, so the record building must
    // create own properties. Both fixtures are built with JSON.parse — the
    // exact shape a wire body and externally-defined ids arrive in (an
    // object literal `{__proto__: …}` sets a prototype, not a key, so it
    // cannot model this).
    vi.stubEnv('LIQUID_API_KEY', 'liquid-key')
    const questions = JSON.parse(
      `{"__proto__":${JSON.stringify(QUESTIONS.refund)},"team":${JSON.stringify(QUESTIONS.team)}}`,
    ) as Record<string, DecisionQuestion>
    mockFetch.mockResolvedValueOnce(
      ok(
        JSON.parse(
          `{"model":"d1","answers":{"__proto__":{"type":"noul","noul":0.9},"team":{"type":"choice","choice":"billing","probabilities":{"billing":0.9,"technical":0.05,"fraud":0.05}}},"usage":{"input_tokens":7,"output_tokens":0}}`,
        ) as unknown,
      ),
    )

    const result = await createProvider({ apiKey: 'k' }).decide({ state: 's', questions })

    // The `__proto__` question actually left the process on the wire.
    const sent = JSON.parse(mockFetch.mock.calls[0]![1].body as string) as {
      questions: Record<string, { type: string }>
    }
    expect(Object.keys(sent.questions)).toEqual(['__proto__', 'team'])
    expect(sent.questions['__proto__']).toMatchObject({ type: 'noul' })
    // …and its answer came back, with the real probability — not the
    // prototype object the inherited getter would have handed back.
    expect(Object.keys(result.answers)).toEqual(['__proto__', 'team'])
    expect(result.answers['__proto__']).toEqual({
      type: 'yesNo',
      probability: 0.9,
      answer: true,
      confidence: 0.9,
    })
    expect(result.answers.team).toMatchObject({ choice: 'billing' })
  })

  it('keeps a choice label of "__proto__" in the answer probabilities', async () => {
    // The choice-answer probability record is built by the same dynamic-key
    // assignment; a criteria label "__proto__" must land as an own property,
    // or its probability is dropped and `confidence` reads the inherited
    // getter (an Object.prototype, not a number).
    vi.stubEnv('LIQUID_API_KEY', 'liquid-key')
    const questions = JSON.parse(
      '{"__proto__":{"type":"choice","instructions":"Which?","criteria":{"__proto__":"Yes","billing":"No"}}}',
    ) as Record<string, DecisionQuestion>
    mockFetch.mockResolvedValueOnce(
      ok(
        JSON.parse(
          '{"answers":{"__proto__":{"type":"choice","choice":"__proto__","probabilities":{"__proto__":0.75,"billing":0.25}}}}',
        ) as unknown,
      ),
    )

    const result = await createProvider({ apiKey: 'k' }).decide({ state: 's', questions })

    const answer = result.answers['__proto__'] as {
      type: string
      choice: string
      probabilities: Record<string, number>
      confidence: number
    }
    // (No `{ __proto__: … }` object literal can appear on the EXPECTED side
    // either — the literal key sets a prototype, so the assertions below
    // compare fields individually.)
    expect(answer.type).toBe('choice')
    expect(answer.choice).toBe('__proto__')
    expect(answer.confidence).toBe(0.75)
    expect(Object.keys(answer.probabilities)).toEqual(['__proto__', 'billing'])
    expect(answer.probabilities['__proto__']).toBe(0.75)
    expect(answer.probabilities.billing).toBe(0.25)
  })

  it('answers a 2xx non-JSON body with a status-carrying error, not a raw SyntaxError', async () => {
    // A proxy/WAF interstitial (or an empty 204 body) reaches the success
    // path: the contract is "an Error carrying status", and a raw SyntaxError
    // would escape it — caller logic keyed on `error.status` never fires.
    vi.stubEnv('LIQUID_API_KEY', 'liquid-key')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: vi
        .fn()
        .mockRejectedValue(new SyntaxError(`Unexpected token '<', "<html>..." is not valid JSON`)),
    })
    const error = (await createProvider()
      .decide({ state: 's', questions: { refund: QUESTIONS.refund } })
      .catch((e: unknown) => e)) as Error & { status?: number }
    expect(error.name).not.toBe('SyntaxError')
    expect(error.status).toBe(502)
    expect(error.message).toContain('non-JSON body')
    expect(error.message).toContain('HTTP 200')
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

  it('stops after maxRetries and throws the status-carrying error, not a retry loop', async () => {
    // The README's contract: 429/5xx-busy are retried up to THREE times, then
    // the failure surfaces as an Error carrying the upstream `status` — the
    // bound and the final shape are two different promises, and only the bound
    // is what keeps a persistently-busy server from pinning the caller forever.
    vi.useFakeTimers()
    try {
      mockFetch.mockResolvedValue(fail(503, 'diffusion engine busy'))
      const decision = createProvider({ apiKey: 'k' }).decide({
        state: 's',
        questions: QUESTIONS,
      })
      const assertion = expect(decision).rejects.toMatchObject({
        status: 503,
        message: expect.stringContaining('diffusion engine busy'),
      })
      // Backoff windows are 250/500/1000 ms; advance past all three.
      await vi.advanceTimersByTimeAsync(1_850)
      await assertion
      // One initial attempt + three retries — a fifth call would mean the
      // retry bound is not enforced.
      expect(mockFetch).toHaveBeenCalledTimes(4)
    } finally {
      vi.useRealTimers()
    }
  })

  it('ends the retry backoff when the caller aborts, instead of sleeping past the deadline', async () => {
    // 429 + `retry-after: 10` arms a 10 s backoff; the caller's signal must cut
    // it short, so decide() rejects at the caller's deadline with the same
    // AbortError the aborted fetch itself would have thrown — not 10 s later.
    const controller = new AbortController()
    mockFetch.mockResolvedValueOnce(fail(429, 'rate limited', { 'retry-after': '10' }))
    const started = Date.now()
    const decision = createProvider({ apiKey: 'k' }).decide({
      state: 's',
      questions: QUESTIONS,
      signal: controller.signal,
    })
    setTimeout(() => controller.abort(), 25)
    await expect(decision).rejects.toMatchObject({ name: 'AbortError' })
    expect(Date.now() - started).toBeLessThan(2_000)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  }, 4_000)

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

  it('re-resolves the headers hook on every retry, so an expiring token is re-minted', async () => {
    // The documented use of the hook is short-lived credentials (a Cloud Run
    // ID token). The retry after a 429 backoff must carry a FRESH hook
    // result, not the value resolved before the first attempt.
    vi.useFakeTimers()
    try {
      let calls = 0
      mockFetch
        .mockResolvedValueOnce(fail(429, 'rate limited'))
        .mockResolvedValueOnce(ok(D1_RESPONSE))
      const decision = createProvider({
        apiKey: 'k',
        headers: async () => {
          calls++
          return { authorization: `Bearer token-${calls}` }
        },
      }).decide({ state: 's', questions: QUESTIONS })
      await vi.advanceTimersByTimeAsync(300)
      await expect(decision).resolves.toBeTruthy()
      expect(calls).toBe(2)
      expect(mockFetch.mock.calls[0]![1].headers.authorization).toBe('Bearer token-1')
      expect(mockFetch.mock.calls[1]![1].headers.authorization).toBe('Bearer token-2')
    } finally {
      vi.useRealTimers()
    }
  })

  it('cancels a retryable response body instead of stranding its socket', async () => {
    // undici does not return a connection to the pool until the response body
    // is consumed or cancelled — an undrained 429/5xx left one socket pinned
    // per retry, pending GC.
    vi.useFakeTimers()
    try {
      const cancel = vi.fn().mockResolvedValue(undefined)
      mockFetch
        .mockResolvedValueOnce({ ...fail(429, 'rate limited'), body: { cancel } })
        .mockResolvedValueOnce(ok(D1_RESPONSE))
      const decision = createProvider({ apiKey: 'k' }).decide({
        state: 's',
        questions: QUESTIONS,
      })
      await vi.advanceTimersByTimeAsync(300)
      await expect(decision).resolves.toBeTruthy()
      expect(cancel).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('exposes the default provider with its name', () => {
    expect(provider.name).toBe('liquid-d1')
  })

  it('picks up LIQUID_API_KEY written to the environment after the provider was created', async () => {
    // The runtime secrets registry (resolveAll()) fetches keys asynchronously
    // and writes them into process.env at startup; a decide() that fires
    // before it finishes must not cache the missing key forever — the next
    // call has to see the key (same contract as the ltx/kandinsky bonds).
    const early = createProvider()
    await expect(
      early.decide({ state: 's', questions: { refund: QUESTIONS.refund } }),
    ).rejects.toThrow(/LIQUID_API_KEY/)
    vi.stubEnv('LIQUID_API_KEY', 'liquid-late')
    mockFetch.mockResolvedValueOnce(ok(D1_RESPONSE))
    await expect(early.decide({ state: 's', questions: QUESTIONS })).resolves.toBeTruthy()
    expect(mockFetch.mock.calls[0]![1].headers.authorization).toBe('Bearer liquid-late')
  })

  it('picks up LIQUID_DECISIONS_URL written to the environment after the provider was created', async () => {
    const early = createProvider()
    vi.stubEnv('LIQUID_API_KEY', 'liquid-key')
    vi.stubEnv('LIQUID_DECISIONS_URL', 'http://10.0.0.9:8080/')
    mockFetch.mockResolvedValueOnce(ok(D1_RESPONSE))
    await early.decide({ state: 's', questions: QUESTIONS })
    expect(mockFetch.mock.calls[0]![0]).toBe('http://10.0.0.9:8080/v1/systemone')
  })

  it('honours secrets synced after the singleton was first used', async () => {
    // The README wires `setProvider(provider)` at startup; touching the
    // singleton (hasProvider()/a startup self-check reads .name) before
    // resolveAll() lands must not pin it to the empty environment.
    expect(provider.name).toBe('liquid-d1')
    await expect(
      provider.decide({ state: 's', questions: { refund: QUESTIONS.refund } }),
    ).rejects.toThrow(/LIQUID_API_KEY/)
    vi.stubEnv('LIQUID_API_KEY', 'liquid-late')
    mockFetch.mockResolvedValueOnce(ok(D1_RESPONSE))
    await expect(provider.decide({ state: 's', questions: QUESTIONS })).resolves.toBeTruthy()
  })
})
