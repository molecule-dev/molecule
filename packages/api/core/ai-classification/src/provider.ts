/**
 * AI classification provider bond accessor + default composed provider.
 *
 * The accessor mirrors the `ai` core (singleton + named). The default
 * `provider` exported here is what apps bond — it implements zero-shot
 * classification by composing the swappable `ai` chat bond
 * (`@molecule/api-ai`): it prompts the bonded LLM to score the candidate
 * labels as strict JSON and normalizes the result.
 *
 * @module
 */

import type { AIProvider, ChatParams, TokenUsage } from '@molecule/api-ai'
import {
  getProviderByName as getAIProviderByName,
  requireProvider as requireAIProvider,
} from '@molecule/api-ai'
import {
  bond,
  expectBond,
  get as bondGet,
  getAll as bondGetAll,
  isBonded,
} from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  AIClassificationProvider,
  ClassifyInput,
  ClassifyResult,
  LabelScore,
} from './types.js'

const BOND_TYPE = 'ai-classification'
expectBond(BOND_TYPE)

// ---------------------------------------------------------------------------
// Accessor — mirrors the `ai` core (singleton + named).
// ---------------------------------------------------------------------------

/**
 * Registers an AI classification provider in singleton mode.
 *
 * @param provider - The default provider implementation for this process.
 */
export function setProvider(provider: AIClassificationProvider): void
/**
 * Registers a named AI classification provider under bond type `ai-classification`.
 *
 * @param name - Provider identifier used when selecting the provider.
 * @param provider - Concrete provider bound to `name`.
 */
export function setProvider(name: string, provider: AIClassificationProvider): void
/**
 * Implementation that powers the `setProvider` overloads.
 *
 * @param nameOrProvider - Provider name (string) or the provider instance (singleton mode).
 * @param provider - The provider instance (only when the first arg is a name).
 */
export function setProvider(
  nameOrProvider: string | AIClassificationProvider,
  provider?: AIClassificationProvider,
): void {
  if (typeof nameOrProvider === 'string') {
    bond(BOND_TYPE, nameOrProvider, provider!)
    // Also register as singleton if none exists yet, so validateBonds() passes
    // and getProvider() works as a fallback.
    if (!isBonded(BOND_TYPE)) {
      bond(BOND_TYPE, provider!)
    }
  } else {
    bond(BOND_TYPE, nameOrProvider)
  }
}

/**
 * Retrieves the singleton AI classification provider, or `null` if none is bonded.
 *
 * Falls back to a single named provider when no singleton is bonded. When
 * multiple named providers are bonded the fallback declines (returns `null`)
 * because the choice is ambiguous — use `getProviderByName(name)` instead.
 *
 * @returns The bonded AI classification provider, or `null`.
 */
export function getProvider(): AIClassificationProvider | null {
  const singleton = bondGet<AIClassificationProvider>(BOND_TYPE)
  if (singleton) return singleton
  const named = bondGetAll<AIClassificationProvider>(BOND_TYPE)
  return named.size === 1 ? (named.values().next().value ?? null) : null
}

/**
 * Retrieves a named AI classification provider, or `null` if not bonded.
 *
 * @param name - The provider name.
 * @returns The named AI classification provider, or `null`.
 */
export function getProviderByName(name: string): AIClassificationProvider | null {
  return bondGet<AIClassificationProvider>(BOND_TYPE, name) ?? null
}

/**
 * Retrieves all named AI classification providers as a Map keyed by name.
 *
 * @returns Map of provider name → AIClassificationProvider.
 */
export function getAllProviders(): Map<string, AIClassificationProvider> {
  return bondGetAll<AIClassificationProvider>(BOND_TYPE)
}

/**
 * Checks whether an AI classification provider is currently bonded.
 *
 * @param name - Optional provider name. If omitted, checks the singleton.
 * @returns `true` if the provider is bonded.
 */
export function hasProvider(name?: string): boolean {
  return name ? isBonded(BOND_TYPE, name) : isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded AI classification provider, throwing if none is bonded.
 *
 * @returns The bonded AI classification provider.
 * @throws {Error} When no provider is bonded.
 */
export function requireProvider(): AIClassificationProvider {
  const found = getProvider()
  if (found) return found
  throw new Error(
    t('ai-classification.error.noProvider', undefined, {
      defaultValue:
        'AI classification provider not configured. Bond an ai-classification provider first.',
    }),
  )
}

// ---------------------------------------------------------------------------
// Default composed provider — scores labels via the bonded `ai` chat bond.
// ---------------------------------------------------------------------------

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
 * Default AI classification provider (`name: 'default'`).
 *
 * Zero-shot classifier composed over the swappable `ai` chat bond. Bond it via
 * `bond('ai-classification', provider)` and it will resolve the bonded `ai`
 * provider lazily at call time, so swapping the AI provider automatically
 * swaps the classifier's backing model.
 */
export const provider: AIClassificationProvider = {
  name: 'default',

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
