/**
 * AI RAG bond accessor + the default composed provider.
 *
 * The accessor mirrors the `@molecule/api-ai` provider accessor: it supports a
 * singleton bond (`bond('ai-rag', provider)`) and named bonds
 * (`setProvider('name', provider)`) so multiple RAG strategies can coexist.
 *
 * The default `provider` exported here is a batteries-included Retrieval-
 * Augmented-Generation implementation built by composing two existing
 * capabilities — it holds no state of its own:
 *
 * - **Retrieval** via `@molecule/api-semantic-search` (`indexDocuments` /
 *   `search` / `removeDocuments`), which itself composes the bonded
 *   `ai-embeddings` + `ai-vector-store` providers.
 * - **Generation** via the bonded `@molecule/api-ai` chat provider.
 *
 * @module
 */

import type { AIProvider, ChatParams, TokenUsage } from '@molecule/api-ai'
import { getProviderByName as getAIByName, requireProvider as requireAI } from '@molecule/api-ai'
import {
  bond,
  expectBond,
  get as bondGet,
  getAll as bondGetAll,
  isBonded,
} from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'
import { indexDocuments, removeDocuments, search } from '@molecule/api-semantic-search'

import type {
  AIRagProvider,
  IngestInput,
  IngestResult,
  RagQueryInput,
  RagQueryResult,
  RemoveInput,
} from './types.js'

const BOND_TYPE = 'ai-rag'
expectBond(BOND_TYPE)

/**
 * Registers the default AI RAG provider in singleton mode.
 *
 * @param provider - The default provider implementation for this process.
 */
export function setProvider(provider: AIRagProvider): void
/**
 * Registers a named AI RAG provider under bond type `ai-rag`.
 *
 * @param name - Provider identifier used when selecting a RAG strategy.
 * @param provider - Concrete provider bound to `name`.
 */
export function setProvider(name: string, provider: AIRagProvider): void
/**
 * Implementation that powers the `setProvider` overloads.
 *
 * @param nameOrProvider - Provider name (string) or the provider instance (singleton mode).
 * @param provider - The provider instance (only when the first arg is a name).
 */
export function setProvider(
  nameOrProvider: string | AIRagProvider,
  provider?: AIRagProvider,
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
 * Retrieves the singleton AI RAG provider, or `null` if none is bonded.
 *
 * Falls back to a single named provider when no singleton is bonded. When
 * multiple named providers are bonded the fallback declines (returns `null`)
 * because the choice is ambiguous — those call sites must use
 * `getProviderByName(name)` explicitly.
 *
 * @returns The bonded AI RAG provider, or `null`.
 */
export function getProvider(): AIRagProvider | null {
  const singleton = bondGet<AIRagProvider>(BOND_TYPE)
  if (singleton) return singleton
  const named = bondGetAll<AIRagProvider>(BOND_TYPE)
  return named.size === 1 ? (named.values().next().value ?? null) : null
}

/**
 * Retrieves a named AI RAG provider, or `null` if not bonded.
 *
 * @param name - The provider name.
 * @returns The named AI RAG provider, or `null`.
 */
export function getProviderByName(name: string): AIRagProvider | null {
  return bondGet<AIRagProvider>(BOND_TYPE, name) ?? null
}

/**
 * Retrieves all named AI RAG providers as a Map keyed by provider name.
 *
 * @returns Map of provider name → AIRagProvider.
 */
export function getAllProviders(): Map<string, AIRagProvider> {
  return bondGetAll<AIRagProvider>(BOND_TYPE)
}

/**
 * Checks whether an AI RAG provider is currently bonded.
 *
 * @param name - Optional provider name. If omitted, checks the singleton.
 * @returns `true` if the provider is bonded.
 */
export function hasProvider(name?: string): boolean {
  return name ? isBonded(BOND_TYPE, name) : isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded AI RAG provider, throwing if none is bonded.
 *
 * Routes through `getProvider()` so the same single-named-bond fallback applies.
 *
 * @returns The bonded AI RAG provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AIRagProvider {
  const provider = getProvider()
  if (provider) return provider
  throw new Error(
    t('ai-rag.error.noProvider', undefined, {
      defaultValue: 'AI RAG provider not configured. Bond an ai-rag provider first.',
    }),
  )
}

/**
 * Base grounding instruction prepended to every RAG answer's system prompt.
 */
const GROUNDING_SYSTEM =
  'Answer the question using ONLY the provided context. Cite sources as [n]. ' +
  'If the context is insufficient, say so.'

/**
 * Guidance added when retrieval returned zero chunks, so the model declines to
 * answer instead of hallucinating from its own knowledge.
 */
const EMPTY_CONTEXT_SYSTEM =
  'The context is empty — no relevant documents were retrieved. Tell the user ' +
  'you do not have information on that rather than guessing.'

/**
 * Runs a non-streaming chat completion and collects the full text + final usage.
 *
 * @param ai - The bonded AI chat provider to generate with.
 * @param params - Chat parameters (messages, system, model, signal, …). `stream`
 *   is forced to `false`.
 * @returns The concatenated answer text and the reported token usage, if any.
 */
async function complete(
  ai: AIProvider,
  params: ChatParams,
): Promise<{ text: string; usage?: TokenUsage }> {
  let text = ''
  let usage: TokenUsage | undefined
  for await (const event of ai.chat({ ...params, stream: false })) {
    if (event.type === 'text') {
      text += event.content
    } else if (event.type === 'usage' || event.type === 'done') {
      // Latest wins; the final `done.usage` is authoritative.
      usage = event.usage
    }
  }
  return { text, usage }
}

/**
 * Default, batteries-included Retrieval-Augmented-Generation provider.
 *
 * Composes `@molecule/api-semantic-search` for retrieval with the bonded
 * `@molecule/api-ai` chat provider for generation. Bond it with
 * `bond('ai-rag', provider)` after bonding an `ai` provider plus the
 * `ai-embeddings` + `ai-vector-store` providers that semantic-search needs.
 */
export const provider: AIRagProvider = {
  name: 'default',

  async ingest(input: IngestInput): Promise<IngestResult> {
    const { indexed, dimension } = await indexDocuments({
      collection: input.collection,
      documents: input.documents,
      model: input.model,
    })
    return { indexed, dimension }
  },

  async query(input: RagQueryInput): Promise<RagQueryResult> {
    const hits = await search({
      collection: input.collection,
      query: input.query,
      topK: input.topK ?? 5,
      filter: input.filter,
      minScore: input.minScore,
    })

    const hasContext = hits.length > 0

    // Resolve the AI provider up front so a missing named provider fails clearly
    // rather than as a null-deref inside the completion loop.
    let ai: AIProvider | null
    if (input.provider) {
      ai = getAIByName(input.provider)
      if (!ai) {
        throw new Error(
          t(
            'ai-rag.error.aiProviderNotBonded',
            { name: input.provider },
            {
              defaultValue: `AI provider "${input.provider}" is not bonded. Bond it before querying.`,
            },
          ),
        )
      }
    } else {
      ai = requireAI()
    }

    // Build a numbered, grounded context block from the retrieved chunks so the
    // model can cite sources as [1], [2], … matching the returned `sources`.
    const context = hasContext
      ? hits.map((hit, index) => `[${index + 1}] ${hit.content ?? ''}`).join('\n\n')
      : '(no relevant documents were found)'

    const systemParts = [GROUNDING_SYSTEM]
    if (!hasContext) systemParts.push(EMPTY_CONTEXT_SYSTEM)
    if (input.system) systemParts.push(input.system)

    const { text, usage } = await complete(ai, {
      system: systemParts.join('\n\n'),
      messages: [{ role: 'user', content: `Context:\n${context}\n\nQuestion: ${input.query}` }],
      model: input.model,
      signal: input.signal,
    })

    return { answer: text, sources: hits, usage }
  },

  async remove(input: RemoveInput): Promise<void> {
    await removeDocuments({ collection: input.collection, ids: input.ids })
  },
}
