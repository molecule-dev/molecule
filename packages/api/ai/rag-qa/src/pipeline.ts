/**
 * RAG pipeline — index chunks via vector bond + answer questions
 * grounded in retrieved sources.
 *
 * @module
 */

import { requireProvider as requireAI } from '@molecule/api-ai'
import { requireProvider as requireEmbeddings } from '@molecule/api-ai-embeddings'
import {
  type MetadataFilter,
  requireProvider as requireVectorStore,
} from '@molecule/api-ai-vector-store'

import { chunkText } from './chunker.js'
import type { ChunkOptions, GroundedAnswer, RetrievalHit } from './types.js'

/** Index a long document by chunking, embedding, and upserting to the vector store. */
export async function indexDocument(opts: {
  collection: string
  documentId: string
  text: string
  metadata?: Record<string, unknown>
  chunking?: ChunkOptions
}): Promise<string[]> {
  const embeddings = requireEmbeddings()
  const vectors = requireVectorStore()

  const chunks = chunkText(opts.text, opts.chunking).map((text, i) => ({
    id: `${opts.documentId}::${i}`,
    text,
    metadata: { ...(opts.metadata ?? {}), document_id: opts.documentId, chunk_index: i },
  }))
  if (chunks.length === 0) return []

  const vectorList = await embeddings.embedDocuments(chunks.map((c) => c.text))

  await vectors.upsert({
    collection: opts.collection,
    records: chunks.map((c, i) => ({
      id: c.id,
      embedding: vectorList[i],
      content: c.text,
      metadata: c.metadata,
    })),
  })
  return chunks.map((c) => c.id)
}

/** Delete all chunks for a previously-indexed document. */
export async function deleteDocument(opts: {
  collection: string
  documentId: string
  maxChunks?: number
}): Promise<void> {
  const vectors = requireVectorStore()
  const ids: string[] = []
  for (let i = 0; i < (opts.maxChunks ?? 1000); i++) ids.push(`${opts.documentId}::${i}`)
  await vectors.delete({ collection: opts.collection, ids })
}

/** Retrieve top-K most similar chunks for a query. */
export async function retrieve(opts: {
  collection: string
  query: string
  topK?: number
  filter?: MetadataFilter[]
}): Promise<RetrievalHit[]> {
  const embeddings = requireEmbeddings()
  const vectors = requireVectorStore()
  const queryVector = await embeddings.embedQuery(opts.query)
  const hits = await vectors.query({
    collection: opts.collection,
    embedding: queryVector,
    topK: opts.topK ?? 5,
    filter: opts.filter,
  })
  return hits.map((h) => ({
    id: h.record.id,
    text: h.record.content ?? '',
    score: h.score,
    metadata: h.record.metadata,
  }))
}

const DEFAULT_GROUND_PROMPT = `You are a helpful assistant answering questions using ONLY the provided context.

If the answer is not in the context, say "I don't know based on the provided sources."

Cite source excerpts by their [number] in the answer when relevant.

Context:
{{CONTEXT}}

Question: {{QUESTION}}

Answer:`

/**
 * Full RAG round-trip: retrieve top-K chunks, format them as numbered
 * sources, and ground a generated answer in them.
 */
export async function answerQuestion(opts: {
  collection: string
  question: string
  topK?: number
  filter?: MetadataFilter[]
  promptTemplate?: string
  model?: string
  temperature?: number
}): Promise<GroundedAnswer> {
  const sources = await retrieve({
    collection: opts.collection,
    query: opts.question,
    topK: opts.topK ?? 5,
    filter: opts.filter,
  })

  if (sources.length === 0) {
    return {
      answer: "I don't know based on the provided sources.",
      sources: [],
    }
  }

  const context = sources.map((s, i) => `[${i + 1}] ${s.text}`).join('\n\n')
  const prompt = (opts.promptTemplate ?? DEFAULT_GROUND_PROMPT)
    .replace('{{CONTEXT}}', context)
    .replace('{{QUESTION}}', opts.question)

  const ai = requireAI()
  let answer = ''
  for await (const event of ai.chat({
    messages: [{ role: 'user', content: prompt }],
    model: opts.model,
    temperature: opts.temperature ?? 0.2,
  })) {
    // A ChatEvent's text payload is `content` (NOT `text` — that is the
    // ContentBlock shape). Reading `event.text` here silently accumulated
    // nothing, so every grounded answer came back empty in production while
    // the unit test's wrong-shaped mock kept it green.
    if (event.type === 'text') answer += event.content
  }

  return {
    answer,
    sources,
    contextTokens: Math.round(context.length / 4),
  }
}
