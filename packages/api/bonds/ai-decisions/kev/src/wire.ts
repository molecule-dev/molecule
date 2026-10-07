/**
 * The `/v1/systemone` wire protocol (TypeSafe Jev, spoken verbatim by Kev's
 * `kev.serve`) ↔ the `@molecule/api-ai-decisions` types.
 *
 * Wire facts (github.com/jaredpalmer/kev `kev/api.py`, `kev/serve.py`):
 * request `{ model?, state, questions: { <id>: { type: 'choice'|'score'|'noul', instructions?, criteria } } }`
 * — `model` is optional, any string is accepted and echoed back, and it never
 * selects a checkpoint; `choice` criteria is `{ label: description }` (1–255
 * options), `score` criteria a list of 1–255 levels, lowest first, `noul`
 * criteria optional `{ true, false }`. There is no `images` field. Answers
 * carry `choice` + `probabilities` keyed by label, `score` (expected level) +
 * `probabilities` keyed `"0".."k-1"`, or `noul` (P(true), no
 * `probabilities`). The wire `confidence` is TypeSafe's dispersion statistic,
 * not an accuracy rate, and is ignored: the core defines `confidence` as the
 * probability of the reported answer, computed here from the distribution.
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

/**
 * Statuses worth retrying: a proxy or platform in front of `kev.serve` (Modal's
 * cold start, a load balancer). `kev.serve` itself never answers these, and a
 * 422 (invalid request, or a state over 65,536 tokens) is never retried.
 */
const RETRYABLE = new Set([429, 502, 503, 504, 529])

/** Options for {@link postSystemOne}. */
export interface PostOptions {
  /** Full endpoint URL. */
  url: string
  /** Bearer token, if any. */
  apiKey?: string
  /** Extra headers resolved before the request (merged over the defaults). */
  headers?: () => Record<string, string> | Promise<Record<string, string>>
  /** Request body. */
  body: Record<string, unknown>
  /** Abort signal. */
  signal?: AbortSignal
  /** Label for error messages (`'Kev'`). */
  label: string
  /** Max retries on a retryable status (default 3). */
  maxRetries?: number
}

/**
 * POSTs a `/v1/systemone` request with retry on 429/5xx-busy, honouring
 * `Retry-After`. Throws an Error carrying `status` on a non-2xx response.
 *
 * @param opts - Request options.
 * @returns The parsed response body.
 */
export async function postSystemOne(opts: PostOptions): Promise<WireResponse> {
  const { url, apiKey, body, signal, label, maxRetries = 3 } = opts
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (apiKey) headers.authorization = `Bearer ${apiKey}`
  if (opts.headers) Object.assign(headers, await opts.headers())
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    })
    if (response.ok) return (await response.json()) as WireResponse
    if (RETRYABLE.has(response.status) && attempt < maxRetries) {
      const retryAfter = Number(response.headers.get('retry-after'))
      const waitMs =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 10_000)
          : 250 * 2 ** attempt
      await new Promise((r) => setTimeout(r, waitMs))
      continue
    }
    const text = await response.text().catch(() => '')
    let detail = text.length > 0 && text.length < 300 ? text : `HTTP ${response.status}`
    try {
      const parsed = JSON.parse(text) as { detail?: unknown; error?: { message?: unknown } }
      if (typeof parsed.detail === 'string') detail = parsed.detail
      else if (Array.isArray(parsed.detail)) {
        // FastAPI request validation: [{ loc, msg, type }, …]
        detail = parsed.detail
          .map((item: { loc?: unknown; msg?: unknown }) =>
            [Array.isArray(item.loc) ? item.loc.join('.') : '', item.msg]
              .filter(Boolean)
              .join(': '),
          )
          .join('; ')
      } else if (typeof parsed.error?.message === 'string') detail = parsed.error.message
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
