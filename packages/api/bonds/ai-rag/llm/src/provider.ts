/**
 * LLM-composed Retrieval-Augmented-Generation provider — the default `ai-rag` bond.
 *
 * Holds no state of its own: it answers questions by composing two existing
 * molecule capabilities —
 *
 * - **Retrieval** via `@molecule/api-semantic-search` (`indexDocuments` /
 *   `search` / `removeDocuments`), which itself composes the bonded
 *   `ai-embeddings` + `ai-vector-store` providers.
 * - **Generation** via the bonded `@molecule/api-ai` chat provider.
 *
 * Wire it with `bond('ai-rag', provider)` after bonding an `ai` provider plus the
 * `ai-embeddings` + `ai-vector-store` providers that semantic-search needs.
 *
 * @module
 */

import type { AIProvider, ChatParams, TokenUsage } from '@molecule/api-ai'
import { getProviderByName as getAIByName, requireProvider as requireAI } from '@molecule/api-ai'
import type {
  AIRagProvider,
  IngestInput,
  IngestResult,
  RagQueryInput,
  RagQueryResult,
  RemoveInput,
} from '@molecule/api-ai-rag'
import { t } from '@molecule/api-i18n'
import { indexDocuments, removeDocuments, search } from '@molecule/api-semantic-search'

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
  name: 'llm',

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
