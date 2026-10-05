/**
 * LLM-backed `AIDecisionsProvider`.
 *
 * Composes the swappable `ai` chat bond (`@molecule/api-ai`): it asks the
 * bonded LLM for a probability distribution per question as strict JSON, then
 * normalizes it into the core's typed answers. Resolves the `ai` provider at
 * call time, so swapping the AI provider swaps the model behind decisions.
 *
 * @module
 */

import type { AIProvider, ChatParams, ContentBlock, TokenUsage } from '@molecule/api-ai'
import {
  getProviderByName as getAIProviderByName,
  requireProvider as requireAIProvider,
} from '@molecule/api-ai'
import type {
  AIDecisionsProvider,
  DecideInput,
  DecideResult,
  DecisionAnswer,
  DecisionQuestion,
} from '@molecule/api-ai-decisions'

/**
 * Configuration for the LLM decisions provider.
 */
export interface LlmDecisionsConfig {
  /**
   * The `ai` provider to use: a bonded provider's NAME, or a provider instance
   * (when the caller routes per request — by region, or to a user's own
   * endpoint). Defaults to the bonded singleton.
   */
  aiProvider?: string | AIProvider
  /** Default chat model id (per-call `model` wins). */
  model?: string
  /**
   * Sampling temperature. **OMITTED by default** — several catalog models
   * (gpt-6-luna et al.) reject the parameter itself with a 400, which made
   * every decide call fail (caught live 2026-10-05; the same fix api-ocr-llm
   * shipped). Pass it only when you know the bonded model accepts it.
   */
  temperature?: number
}

/**
 * Collects a non-streaming chat completion into `{ text, usage }`.
 *
 * @param ai - The AI provider.
 * @param params - Chat parameters.
 * @returns The concatenated text and usage.
 */
async function complete(
  ai: AIProvider,
  params: ChatParams,
): Promise<{ text: string; usage?: TokenUsage }> {
  let text = ''
  let usage: TokenUsage | undefined
  for await (const event of ai.chat({ ...params, stream: false })) {
    if (event.type === 'text') text += event.content
    else if (event.type === 'done') usage = event.usage
    else if (event.type === 'error') throw new Error(event.message)
  }
  return { text, usage }
}

/**
 * Extracts the first balanced `{...}` object from model text (fences and prose tolerated).
 *
 * @param raw - Model output.
 * @returns The JSON substring, or `null`.
 */
export function extractJsonObject(raw: string): string | null {
  let s = raw.trim()
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) s = fenced[1].trim()
  const start = s.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (inString) {
      if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return s.slice(start, i + 1)
    }
  }
  return null
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0
}

/** Rescales to sum 1; a zero vector becomes uniform. */
const normalize = (ps: number[]): number[] => {
  const sum = ps.reduce((a, b) => a + b, 0)
  return sum > 0 ? ps.map((p) => p / sum) : ps.map(() => 1 / ps.length)
}

/**
 * Describes one question for the prompt, with the exact JSON it must answer with.
 *
 * @param id - Question id.
 * @param q - The question.
 * @returns A prompt fragment.
 */
function describeQuestion(id: string, q: DecisionQuestion): string {
  if (q.type === 'choice') {
    const opts = Object.entries(q.criteria)
      .map(([k, v]) => `    - ${JSON.stringify(k)}: ${v}`)
      .join('\n')
    return `- ${JSON.stringify(id)} (pick exactly one option): ${q.instructions}\n  Options:\n${opts}\n  Answer: {"probabilities": {<every option key>: <0..1>}}`
  }
  if (q.type === 'score') {
    const levels = q.criteria.map((v, i) => `    ${i}: ${v}`).join('\n')
    return `- ${JSON.stringify(id)} (rate on an ordered scale, lowest first): ${q.instructions}\n  Levels:\n${levels}\n  Answer: {"probabilities": [<one 0..1 per level, in order>]}`
  }
  const yes = q.criteria?.yes ? ` Yes means: ${q.criteria.yes}.` : ''
  const no = q.criteria?.no ? ` No means: ${q.criteria.no}.` : ''
  return `- ${JSON.stringify(id)} (how likely is this statement true): ${q.instructions}${yes}${no}\n  Answer: {"probability": <0..1>}`
}

/**
 * Builds a typed answer from the model's per-question JSON.
 *
 * @param id - Question id.
 * @param q - The question.
 * @param raw - The model's object for this question.
 * @param minConfidence - Optional threshold.
 * @returns The typed answer.
 */
function toAnswer(
  id: string,
  q: DecisionQuestion,
  raw: unknown,
  minConfidence?: number,
): DecisionAnswer {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`ai-decisions-llm: the model returned no answer for question "${id}"`)
  }
  const r = raw as { probabilities?: unknown; probability?: unknown }
  let answer: DecisionAnswer
  if (q.type === 'choice') {
    const labels = Object.keys(q.criteria)
    const rec = (r.probabilities ?? {}) as Record<string, unknown>
    const ps = normalize(labels.map((l) => num(rec[l])))
    const probabilities = Object.fromEntries(labels.map((l, i) => [l, ps[i]!]))
    let best = 0
    ps.forEach((p, i) => {
      if (p > ps[best]!) best = i
    })
    answer = { type: 'choice', choice: labels[best]!, probabilities, confidence: ps[best]! }
  } else if (q.type === 'score') {
    const arr = Array.isArray(r.probabilities) ? r.probabilities : []
    const probabilities = normalize(q.criteria.map((_, i) => num(arr[i])))
    let level = 0
    probabilities.forEach((p, i) => {
      if (p > probabilities[level]!) level = i
    })
    const score = probabilities.reduce((s, p, i) => s + p * i, 0)
    answer = { type: 'score', score, level, probabilities, confidence: probabilities[level]! }
  } else {
    if (r.probability === undefined) {
      throw new Error(`ai-decisions-llm: the model's answer to "${id}" has no probability`)
    }
    const probability = num(r.probability)
    answer = {
      type: 'yesNo',
      probability,
      answer: probability >= 0.5,
      confidence: Math.max(probability, 1 - probability),
    }
  }
  if (typeof minConfidence === 'number') answer.lowConfidence = answer.confidence < minConfidence
  return answer
}

/**
 * Creates an LLM decisions provider.
 *
 * @param config - Optional named AI provider and default model.
 * @returns An `AIDecisionsProvider` composed over the `ai` bond.
 */
export function createProvider(config: LlmDecisionsConfig = {}): AIDecisionsProvider {
  return {
    name: 'llm',
    async decide<Q extends Record<string, DecisionQuestion>>(
      input: DecideInput<Q>,
    ): Promise<DecideResult<Q>> {
      if (input.state === undefined || input.state === null) {
        throw new Error('ai-decisions: decide() requires a `state`')
      }
      const entries = Object.entries(input.questions ?? {})
      if (entries.length === 0)
        throw new Error('ai-decisions: decide() requires at least one question')

      let ai: AIProvider | null
      if (config.aiProvider && typeof config.aiProvider === 'object') {
        ai = config.aiProvider
      } else if (config.aiProvider) {
        ai = getAIProviderByName(config.aiProvider)
        if (!ai)
          throw new Error(`ai-decisions-llm: AI provider "${config.aiProvider}" is not bonded`)
      } else {
        ai = requireAIProvider()
      }

      const system = [
        'You answer typed questions about a piece of state with calibrated probabilities.',
        'Use ONLY the given option keys and level indexes. Probabilities within one question sum to 1.',
        'Respond with ONLY one JSON object mapping every question id to its answer object. No prose, no code fences.',
      ].join('\n')
      // Compact, never indented: indentation grows with nesting depth x width, and 43 KB of
      // nested arrays became a 64-million-character prompt (a request-sized input must not
      // multiply by orders of magnitude on its way to the model).
      const state = typeof input.state === 'string' ? input.state : JSON.stringify(input.state)
      const images = input.images ?? []
      const user = [
        'State:',
        state,
        ...(images.length
          ? ['', `The ${images.length} attached image(s) are part of the state.`]
          : []),
        '',
        'Questions:',
        ...entries.map(([id, q]) => describeQuestion(id, q)),
      ].join('\n')
      // Images ride as generic content blocks; the bonded `ai` provider maps
      // them to its native vision format (and errors if its model has none).
      const content: string | ContentBlock[] = images.length
        ? [
            ...images.map((image): ContentBlock => ({
              type: 'image',
              mediaType: image.mimeType,
              data: image.data,
            })),
            { type: 'text', text: user },
          ]
        : user

      const { text, usage } = await complete(ai, {
        messages: [{ role: 'user', content }],
        system,
        model: input.model ?? config.model,
        // No default temperature: several catalog models (gpt-6-luna et al.)
        // reject the PARAMETER itself with a 400, which made every hosted
        // decide call fail (caught live 2026-10-05 — the same fix api-ocr-llm
        // shipped). Callers who want pinning pass config.temperature and own
        // the model-compatibility check.
        ...(config.temperature !== undefined ? { temperature: config.temperature } : {}),
        signal: input.signal,
      })

      const json = extractJsonObject(text)
      let parsed: Record<string, unknown>
      try {
        if (!json) throw new Error('no JSON object')
        parsed = JSON.parse(json) as Record<string, unknown>
      } catch (error) {
        // Name the output: the parse error alone is not actionable.
        throw new Error(
          `ai-decisions-llm: could not parse a JSON answer object from the model output: ${text.slice(0, 200)}`,
          { cause: error },
        )
      }
      const answers: Record<string, DecisionAnswer> = {}
      for (const [id, q] of entries) answers[id] = toAnswer(id, q, parsed[id], input.minConfidence)
      return {
        answers: answers as DecideResult<Q>['answers'],
        ...(usage
          ? { usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens } }
          : {}),
      }
    },
  }
}

/** The provider, over the bonded singleton `ai` provider. */
export const provider: AIDecisionsProvider = createProvider()
