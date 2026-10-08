/**
 * Liquid d1's `/v1/systemone` wire protocol (hosted at
 * `https://api.liquid.ai/decisions/v1/systemone` and spoken verbatim by
 * `llama-server -hf LiquidAI/d1-3B-GGUF`) ↔ the `@molecule/api-ai-decisions`
 * types.
 *
 * Wire facts (docs.liquid.ai/lfm/models/d1): request
 * `{ model?, state, questions: { <id>: { type: 'choice'|'score'|'noul', instructions, criteria } }, images? }`;
 * `choice` criteria is `{ label: description }`, `score` criteria a list of
 * 2–10 levels (lowest first), `noul` criteria optional `{ true, false }`.
 * `images` entries are base64 data URL strings or `{ content_type, base64 }`
 * objects. Answers carry `choice` + `probabilities` keyed by label, `score`
 * (probability-weighted level) + `probabilities` keyed `"0".."k-1"`, or
 * `noul` (P(true)). Vendor `confidence` fields are ignored: the core defines
 * `confidence` as the probability of the reported answer, computed here from
 * the distribution.
 *
 * @module
 */

import type {
  ChoiceAnswer,
  DecideResult,
  DecisionAnswer,
  DecisionQuestion,
  ScoreAnswer,
  YesNoAnswer,
} from '@molecule/api-ai-decisions'

/** One question as sent on the wire. */
export interface WireQuestion {
  type: 'choice' | 'score' | 'noul'
  instructions: string
  criteria?: Record<string, string> | string[]
}

/** One answer as received on the wire (only the fields we read). */
export interface WireAnswer {
  type?: string
  choice?: string
  score?: number
  noul?: number
  probabilities?: Record<string, number>
}

/** The response body (only the fields we read). */
export interface WireResponse {
  model?: string
  answers?: Record<string, WireAnswer>
  usage?: { input_tokens?: number; output_tokens?: number }
}

/**
 * Converts the core's questions into wire questions (`yesNo` → `noul`).
 *
 * @param questions - The questions keyed by id.
 * @returns The wire `questions` object.
 */
export function toWireQuestions(
  questions: Record<string, DecisionQuestion>,
): Record<string, WireQuestion> {
  const out: Record<string, WireQuestion> = {}
  for (const [id, q] of Object.entries(questions)) {
    if (q.type === 'choice') {
      out[id] = { type: 'choice', instructions: q.instructions, criteria: q.criteria }
    } else if (q.type === 'score') {
      out[id] = { type: 'score', instructions: q.instructions, criteria: q.criteria }
    } else if (q.type === 'yesNo') {
      const criteria: Record<string, string> = {}
      if (q.criteria?.yes) criteria.true = q.criteria.yes
      if (q.criteria?.no) criteria.false = q.criteria.no
      out[id] = {
        type: 'noul',
        instructions: q.instructions,
        ...(Object.keys(criteria).length ? { criteria } : {}),
      }
    } else {
      throw new Error(
        `ai-decisions: question "${id}" has unknown type "${(q as { type: string }).type}"`,
      )
    }
  }
  return out
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))

/**
 * Converts one wire answer into the core's answer for `question`.
 *
 * @param id - The question id (for error messages).
 * @param question - The question that was asked.
 * @param wire - The wire answer.
 * @param minConfidence - Optional low-confidence threshold.
 * @returns The typed answer.
 */
export function fromWireAnswer(
  id: string,
  question: DecisionQuestion,
  wire: WireAnswer | undefined,
  minConfidence?: number,
): DecisionAnswer {
  if (!wire || typeof wire !== 'object') {
    throw new Error(`ai-decisions: the provider returned no answer for question "${id}"`)
  }
  let answer: DecisionAnswer
  if (question.type === 'choice') {
    const labels = Object.keys(question.criteria)
    const probabilities: Record<string, number> = {}
    for (const label of labels) probabilities[label] = clamp01(num(wire.probabilities?.[label]))
    let top = labels[0] ?? ''
    for (const label of labels) if (probabilities[label]! > probabilities[top]!) top = label
    const choice =
      typeof wire.choice === 'string' && labels.includes(wire.choice) ? wire.choice : top
    answer = {
      type: 'choice',
      choice,
      probabilities,
      confidence: probabilities[choice] ?? 0,
    } satisfies ChoiceAnswer
  } else if (question.type === 'score') {
    const probabilities = question.criteria.map((_, i) =>
      clamp01(num(wire.probabilities?.[String(i)])),
    )
    let level = 0
    probabilities.forEach((p, i) => {
      if (p > probabilities[level]!) level = i
    })
    const expected = probabilities.reduce((sum, p, i) => sum + p * i, 0)
    answer = {
      type: 'score',
      score: typeof wire.score === 'number' && Number.isFinite(wire.score) ? wire.score : expected,
      level,
      probabilities,
      confidence: probabilities[level] ?? 0,
    } satisfies ScoreAnswer
  } else {
    if (typeof wire.noul !== 'number' || !Number.isFinite(wire.noul)) {
      throw new Error(`ai-decisions: the provider's answer to "${id}" has no noul probability`)
    }
    const probability = clamp01(wire.noul)
    answer = {
      type: 'yesNo',
      probability,
      answer: probability >= 0.5,
      confidence: Math.max(probability, 1 - probability),
    } satisfies YesNoAnswer
  }
  if (typeof minConfidence === 'number') answer.lowConfidence = answer.confidence < minConfidence
  return answer
}

/**
 * Converts a whole wire response into the core's result.
 *
 * @param questions - The questions that were asked.
 * @param body - The parsed response body.
 * @param minConfidence - Optional low-confidence threshold.
 * @returns The typed result.
 */
export function fromWireResponse<Q extends Record<string, DecisionQuestion>>(
  questions: Q,
  body: WireResponse,
  minConfidence?: number,
): DecideResult<Q> {
  const answers: Record<string, DecisionAnswer> = {}
  for (const [id, q] of Object.entries(questions)) {
    answers[id] = fromWireAnswer(id, q, body.answers?.[id], minConfidence)
  }
  return {
    answers: answers as DecideResult<Q>['answers'],
    ...(typeof body.model === 'string' ? { model: body.model } : {}),
    ...(body.usage
      ? {
          usage: {
            inputTokens: num(body.usage.input_tokens),
            outputTokens: num(body.usage.output_tokens),
          },
        }
      : {}),
  }
}

/** Statuses worth retrying: rate limit and busy/overloaded gateways. */
const RETRYABLE = new Set([429, 502, 503, 504, 529])

/**
 * Sleeps for `ms`, ending early with `signal`'s reason if the caller aborts —
 * so a caller's deadline bounds the retry backoff too. Without this the
 * backoff sleeps its full window (up to the 10 s `Retry-After` cap) on an
 * already-aborted signal, and the decision promise stays pending long past
 * its deadline before the next `fetch` finally rejects.
 *
 * @param ms - How long to sleep.
 * @param signal - The caller's abort signal, if any.
 * @returns Resolved after the sleep, or rejected with the signal's reason.
 */
function sleepAbortable(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (!signal) {
      setTimeout(resolve, ms)
      return
    }
    if (signal.aborted) {
      reject(signal.reason)
      return
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = (): void => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

/** Options for {@link postSystemOne}. */
export interface PostOptions {
  /** Full endpoint URL. */
  url: string
  /** Bearer token, if any. */
  apiKey?: string
  /** Extra headers resolved before each attempt, retries included (merged over the defaults). */
  headers?: () => Record<string, string> | Promise<Record<string, string>>
  /** Request body. */
  body: Record<string, unknown>
  /** Abort signal. */
  signal?: AbortSignal
  /** Label for error messages (`'Liquid d1'`). */
  label: string
  /** Max retries on a retryable status (default 3). */
  maxRetries?: number
}

/**
 * POSTs a systemone request with retry on 429/5xx-busy, honouring
 * `Retry-After`; an aborting `signal` ends the backoff early with the
 * signal's reason. Throws an Error carrying `status` on a non-2xx response or
 * a 2xx response whose body is not JSON.
 *
 * @param opts - Request options.
 * @returns The parsed response body.
 */
export async function postSystemOne(opts: PostOptions): Promise<WireResponse> {
  const { url, apiKey, body, signal, label, maxRetries = 3 } = opts
  for (let attempt = 0; ; attempt++) {
    // Headers are rebuilt and the hook re-resolved on EVERY attempt: the hook
    // exists for short-lived credentials (a Cloud Run ID token), which can
    // expire while a retry backoff sleeps.
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (apiKey) headers.authorization = `Bearer ${apiKey}`
    if (opts.headers) Object.assign(headers, await opts.headers())
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    })
    if (response.ok) {
      try {
        return (await response.json()) as WireResponse
      } catch (error) {
        // A 2xx with a non-JSON body (a proxy/WAF interstitial, an empty 204)
        // must fail the same way every other failure does — an Error carrying
        // `status`. A raw SyntaxError would escape that contract, so caller
        // logic keyed on `error.status` never fires. 502 = "the upstream's
        // answer is unusable"; the real upstream status rides in the message.
        const reason = error instanceof Error ? error.message : String(error)
        throw Object.assign(
          new Error(
            `${label} decision request failed (502): 2xx response with a non-JSON body (HTTP ${response.status}): ${reason}`,
            { cause: error },
          ),
          { status: 502 },
        )
      }
    }
    if (RETRYABLE.has(response.status) && attempt < maxRetries) {
      // Release the failed response's body (and with it its socket) before
      // sleeping: the connection pool does not take a connection back until
      // the body is consumed or cancelled, so every undrained retryable
      // response would strand a socket until GC reclaims it.
      await response.body?.cancel().catch((_error: unknown) => {
        // Best-effort release only — the retry proceeds on the already-known
        // status, and a failed cancel merely delays connection reuse.
      })
      const retryAfter = Number(response.headers.get('retry-after'))
      const waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 10_000)
          : 250 * 2 ** attempt
      await sleepAbortable(waitMs, signal)
      continue
    }
    const text = await response.text().catch(() => '')
    let detail = text.length > 0 && text.length < 300 ? text : `HTTP ${response.status}`
    try {
      const parsed = JSON.parse(text) as { detail?: unknown; error?: { message?: unknown } }
      if (typeof parsed.detail === 'string') detail = parsed.detail
      else if (typeof parsed.error?.message === 'string') detail = parsed.error.message
    } catch (_error) {
      // Not JSON — keep the raw text (or the status) as the detail.
    }
    throw Object.assign(
      new Error(`${label} decision request failed (${response.status}): ${detail}`),
      {
        status: response.status,
      },
    )
  }
}
