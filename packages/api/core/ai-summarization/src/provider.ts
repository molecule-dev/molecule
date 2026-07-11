/**
 * AI summarization provider bond accessor + batteries-included default.
 *
 * The accessor mirrors the `@molecule/api-ai` core: providers are wired through
 * the `@molecule/api-bond` registry under bond type `ai-summarization`, so
 * `bond('ai-summarization', provider)` and these typed accessors stay in sync.
 * Supports both a singleton and named providers.
 *
 * The exported `provider` is the default implementation. It has no vendor of its
 * own — it composes the bonded `ai` chat provider (`@molecule/api-ai`) with a
 * summarizer system prompt built from the requested format / length / focus.
 *
 * @module
 */

import {
  type AIProvider,
  type ChatParams,
  getProviderByName as getAIProviderByName,
  requireProvider as requireAIProvider,
  type TokenUsage,
} from '@molecule/api-ai'
import {
  bond,
  expectBond,
  get as bondGet,
  getAll as bondGetAll,
  isBonded,
} from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { AISummarizationProvider, SummarizeInput, SummarizeResult } from './types.js'

const BOND_TYPE = 'ai-summarization'
expectBond(BOND_TYPE)

/**
 * Registers an AI summarization provider in singleton mode.
 *
 * - **Singleton**: `setProvider(provider)` — bonds a single default provider.
 *
 * @param provider - The default provider implementation for this process.
 */
export function setProvider(provider: AISummarizationProvider): void
/**
 * Registers a named AI summarization provider under bond type `ai-summarization`.
 *
 * - **Named**: `setProvider('fast', provider)` — bonds a named provider
 *   alongside others.
 *
 * @param name - Provider identifier used when selecting a provider.
 * @param provider - Concrete provider bound to `name`.
 */
export function setProvider(name: string, provider: AISummarizationProvider): void
/**
 * Implementation that powers the `setProvider` overloads.
 *
 * @param nameOrProvider - Provider name (string) or the provider instance (singleton mode).
 * @param provider - The provider instance (only when the first arg is a name).
 */
export function setProvider(
  nameOrProvider: string | AISummarizationProvider,
  provider?: AISummarizationProvider,
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
 * Retrieves the singleton AI summarization provider, or `null` if none is bonded.
 *
 * Falls back to a single named provider when no singleton is bonded — this lets
 * apps that wire `bond('ai-summarization', 'fast', provider)` directly still
 * work with the simple `getProvider()` / `requireProvider()` accessors. When
 * multiple named providers are bonded, the fallback declines (returns `null`)
 * because the choice is ambiguous.
 *
 * @returns The bonded AI summarization provider, or `null`.
 */
export function getProvider(): AISummarizationProvider | null {
  const singleton = bondGet<AISummarizationProvider>(BOND_TYPE)
  if (singleton) return singleton
  const named = bondGetAll<AISummarizationProvider>(BOND_TYPE)
  return named.size === 1 ? (named.values().next().value ?? null) : null
}

/**
 * Retrieves a named AI summarization provider, or `null` if not bonded.
 *
 * @param name - The provider name.
 * @returns The named provider, or `null`.
 */
export function getProviderByName(name: string): AISummarizationProvider | null {
  return bondGet<AISummarizationProvider>(BOND_TYPE, name) ?? null
}

/**
 * Retrieves all named AI summarization providers as a Map keyed by name.
 *
 * @returns Map of provider name → AISummarizationProvider.
 */
export function getAllProviders(): Map<string, AISummarizationProvider> {
  return bondGetAll<AISummarizationProvider>(BOND_TYPE)
}

/**
 * Checks whether an AI summarization provider is currently bonded.
 *
 * @param name - Optional provider name. If omitted, checks the singleton.
 * @returns `true` if the provider is bonded.
 */
export function hasProvider(name?: string): boolean {
  return name ? isBonded(BOND_TYPE, name) : isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded AI summarization provider, throwing if none is bonded.
 *
 * @returns The bonded provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AISummarizationProvider {
  const bonded = getProvider()
  if (bonded) return bonded
  throw new Error(
    t('ai-summarization.error.noProvider', undefined, {
      defaultValue:
        'AI summarization provider not configured. Bond an AI summarization provider first.',
    }),
  )
}

/**
 * Collects a non-streaming chat completion into a single string + usage.
 *
 * Shared shape for AI-composed cores (summarization, translation, …): iterate
 * the provider's event stream, concatenate `text` events, capture the final
 * `done` event's usage, and surface an `error` event as a thrown error.
 *
 * @param ai - The resolved AI provider to drive.
 * @param params - Chat parameters (the caller forces non-streaming).
 * @returns The concatenated text and the final token usage (when reported).
 */
async function complete(
  ai: AIProvider,
  params: ChatParams,
): Promise<{ text: string; usage?: TokenUsage }> {
  let text = ''
  let usage: TokenUsage | undefined
  for await (const event of ai.chat(params)) {
    if (event.type === 'text') {
      text += event.content
    } else if (event.type === 'done') {
      usage = event.usage
    } else if (event.type === 'error') {
      throw new Error(
        t(
          'ai-summarization.error.aiFailed',
          { message: event.message },
          { defaultValue: 'AI summarization failed: {{message}}' },
        ),
      )
    }
  }
  return { text, usage }
}

/**
 * Builds the summarizer system prompt from the requested shape/length/focus.
 *
 * @param input - The summarize controls.
 * @returns A system prompt string for the AI chat call.
 */
function buildSystemPrompt(input: SummarizeInput): string {
  const format = input.format ?? 'paragraph'
  const shape =
    format === 'bullets'
      ? 'a concise bulleted list'
      : format === 'tldr'
        ? 'a single-sentence TL;DR'
        : 'a concise paragraph'

  const lines = [`You are an expert summarizer. Produce ${shape} summary of the user's text.`]
  if (typeof input.maxLength === 'number' && input.maxLength > 0) {
    lines.push(`Keep it to roughly ${input.maxLength} words max.`)
  }
  if (input.focus) {
    lines.push(`Focus on: ${input.focus}`)
  }
  lines.push('Return only the summary, with no preamble, labels, or commentary.')
  return lines.join('\n')
}

/**
 * Default AI summarization provider.
 *
 * Composes the bonded `ai` chat provider (`@molecule/api-ai`) — an AI provider
 * MUST be bonded first (`bond('ai', <provider>)`), or `summarize()` throws. Bond
 * it with `bond('ai-summarization', provider)`; swap in a custom
 * `AISummarizationProvider` to replace it without touching call sites.
 */
export const provider: AISummarizationProvider = {
  name: 'default',
  async summarize(input: SummarizeInput): Promise<SummarizeResult> {
    const ai = input.provider ? getAIProviderByName(input.provider) : requireAIProvider()
    if (!ai) {
      throw new Error(
        t(
          'ai-summarization.error.aiProviderMissing',
          { provider: input.provider ?? '' },
          {
            defaultValue: 'AI provider "{{provider}}" is not bonded. Bond it before summarizing.',
          },
        ),
      )
    }

    const params: ChatParams = {
      messages: [{ role: 'user', content: input.text }],
      system: buildSystemPrompt(input),
      model: input.model,
      stream: false,
      signal: input.signal,
    }

    const { text, usage } = await complete(ai, params)
    return { summary: text.trim(), usage }
  },
}
