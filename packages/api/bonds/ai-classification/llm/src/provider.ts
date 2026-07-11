/**
 * LLM-backed AI classification provider.
 *
 * Zero-shot text classifier that composes the swappable `ai` chat bond
 * (`@molecule/api-ai`): it prompts the bonded LLM to score the candidate labels
 * as strict JSON, then normalizes the result into a sorted, candidate-restricted
 * `ClassifyResult`. Because it resolves the `ai` provider lazily at call time,
 * swapping the AI provider automatically swaps the classifier's backing model.
 *
 * @example
 * ```typescript
 * import { bond } from '@molecule/api-bond'
 * import { provider as anthropic } from '@molecule/api-ai-anthropic'
 * import { provider as classification } from '@molecule/api-ai-classification-llm'
 * import { requireProvider } from '@molecule/api-ai-classification'
 *
 * // Wire an AI provider + the classifier at startup.
 * bond('ai', anthropic)
 * bond('ai-classification', classification)
 *
 * // Use it anywhere.
 * const result = await requireProvider().classify({
 *   text: 'Win a FREE $1000 gift card now!!!',
 *   labels: ['spam', 'ham'],
 * })
 * console.log(result.top)    // 'spam'
 * console.log(result.labels) // [{ label: 'spam', score: 0.98 }, { label: 'ham', score: 0.02 }]
 * ```
 *
 * @remarks
 * - **Requires a bonded `ai` provider.** `classify()` resolves the AI provider
 *   from the bond registry at call time via `@molecule/api-ai` — bond one
 *   (`bond('ai', anthropic)`) before classifying, or pass `provider: '<name>'`
 *   to target a specific named AI provider. It throws if none is bonded.
 * - **Swappable.** Both the classifier (`bond('ai-classification', ...)`) and
 *   the underlying model (`bond('ai', ...)`) are swappable at runtime; this
 *   provider follows whichever `ai` provider is bonded.
 * - Pass `multiLabel: true` when several labels can apply at once, and
 *   `instructions` to give the model label definitions or extra guidance.
 * - `result.labels` is restricted to the candidate set, sorted descending by
 *   score; missing labels default to `0` and out-of-range scores are clamped to
 *   `0..1`. Unparseable model output throws (with an output snippet) rather than
 *   returning silent garbage. Fenced ```json``` blocks and surrounding prose are
 *   tolerated.
 *
 * @module
 */

import type { AIProvider, ChatParams, TokenUsage } from '@molecule/api-ai'
import {
  getProviderByName as getAIProviderByName,
  requireProvider as requireAIProvider,
} from '@molecule/api-ai'
import type {
  AIClassificationProvider,
  ClassifyInput,
  ClassifyResult,
  LabelScore,
} from '@molecule/api-ai-classification'
import { t } from '@molecule/api-i18n'

/**
 * Collect a non-streaming chat completion into `{ text, usage }`.
 *
 * Accumulates every `text` event, captures the final `done.usage`, and throws
 * on an `error` event so failures surface instead of returning partial output.
 *
 * @param ai - The bonded AI provider to call.
 * @param params - Chat parameters (forced to `stream: false`).
 * @returns The concatenated text and reported token usage.
 * @throws {Error} When the provider emits an `error` event.
 */
async function complete(
  ai: AIProvider,
  params: ChatParams,
): Promise<{ text: string; usage?: TokenUsage }> {
  let text = ''
  let usage: TokenUsage | undefined
  for await (const event of ai.chat({ ...params, stream: false })) {
    switch (event.type) {
      case 'text':
        text += event.content
        break
      case 'done':
        usage = event.usage
        break
      case 'error':
        throw new Error(event.message)
      default:
        break
    }
  }
  return { text, usage }
}

/**
 * Extract the first balanced `{...}` JSON object from a model response.
 *
 * Tolerates code fences and leading/trailing prose by locating the first `{`
 * and scanning to its matching `}` (string- and escape-aware).
 *
 * @param raw - The raw model text.
 * @returns The JSON substring, or `null` if no balanced object is found.
 */
function extractJsonObject(raw: string): string | null {
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

/**
 * Parse the model output into normalized, score-sorted `LabelScore[]`
 * restricted to the candidate set (missing labels default to 0).
 *
 * @param raw - The raw model text.
 * @param labels - The candidate label set.
 * @returns Candidate labels with scores, sorted descending.
 * @throws {Error} When no parseable `{ "scores": {...} }` object is found.
 */
function parseScores(raw: string, labels: string[]): LabelScore[] {
  const jsonStr = extractJsonObject(raw)
  const fail = (): never => {
    throw new Error(
      t('ai-classification.error.parseFailed', undefined, {
        defaultValue: `AI classification could not parse a JSON scores object from the model output: ${raw.slice(0, 200)}`,
      }),
    )
  }
  if (!jsonStr) return fail()

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch (_error) {
    // The raw SyntaxError is not actionable; fail() re-throws a clearer error
    // that includes a snippet of the offending model output for debugging.
    return fail()
  }

  const scoresObj = (parsed as { scores?: unknown })?.scores
  if (!scoresObj || typeof scoresObj !== 'object') return fail()

  const record = scoresObj as Record<string, unknown>
  const scores: LabelScore[] = labels.map((label) => {
    const rawScore = record[label]
    let score = typeof rawScore === 'number' ? rawScore : Number(rawScore)
    if (!Number.isFinite(score)) score = 0
    score = Math.max(0, Math.min(1, score))
    return { label, score }
  })
  scores.sort((a, b) => b.score - a.score)
  return scores
}

/**
 * LLM-backed AI classification provider (`name: 'llm'`).
 *
 * Zero-shot classifier composed over the swappable `ai` chat bond. Bond it via
 * `bond('ai-classification', provider)` and it will resolve the bonded `ai`
 * provider lazily at call time, so swapping the AI provider automatically
 * swaps the classifier's backing model.
 */
export const provider: AIClassificationProvider = {
  name: 'llm',

  async classify(input: ClassifyInput): Promise<ClassifyResult> {
    const {
      text,
      labels,
      multiLabel = false,
      instructions,
      model,
      provider: providerName,
      signal,
    } = input

    if (!Array.isArray(labels) || labels.length === 0) {
      throw new Error(
        t('ai-classification.error.noLabels', undefined, {
          defaultValue: 'classify() requires a non-empty `labels` array of candidate labels.',
        }),
      )
    }

    let ai: AIProvider | null
    if (providerName) {
      ai = getAIProviderByName(providerName)
      if (!ai) {
        throw new Error(
          t(
            'ai-classification.error.aiProviderNotFound',
            { name: providerName },
            {
              defaultValue: `AI provider "${providerName}" is not bonded. Bond it before classifying.`,
            },
          ),
        )
      }
    } else {
      ai = requireAIProvider()
    }

    const system = [
      'You are a strict text classifier.',
      'Classify the text against ONLY the provided candidate labels — never invent new labels.',
      multiLabel
        ? 'Multiple labels may apply; score each label independently.'
        : 'Exactly one label best applies; give the single best label the highest score.',
      instructions ? `Additional guidance: ${instructions}` : '',
      'Respond with ONLY a JSON object of the form {"scores": {"<label>": <number between 0 and 1>, ...}} that includes EVERY candidate label. No preamble, no explanation, no code fences.',
    ]
      .filter(Boolean)
      .join('\n')

    const user = [
      `Candidate labels: ${JSON.stringify(labels)}`,
      '',
      'Text to classify:',
      text,
    ].join('\n')

    const { text: output, usage } = await complete(ai, {
      messages: [{ role: 'user', content: user }],
      system,
      model,
      temperature: 0,
      signal,
    })

    const scores = parseScores(output, labels)
    return { labels: scores, top: scores[0]!.label, usage }
  },
}
