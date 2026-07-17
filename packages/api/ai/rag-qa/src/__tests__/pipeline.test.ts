const {
  mockRequireAI,
  mockRequireEmbeddings,
  mockRequireVectors,
  mockChat,
  mockEmbedDocuments,
  mockEmbedQuery,
  mockVectorUpsert,
  mockVectorQuery,
  mockVectorDelete,
} = vi.hoisted(() => ({
  mockRequireAI: vi.fn(),
  mockRequireEmbeddings: vi.fn(),
  mockRequireVectors: vi.fn(),
  mockChat: vi.fn(),
  mockEmbedDocuments: vi.fn(),
  mockEmbedQuery: vi.fn(),
  mockVectorUpsert: vi.fn(),
  mockVectorQuery: vi.fn(),
  mockVectorDelete: vi.fn(),
}))

vi.mock('@molecule/api-ai', () => ({
  requireProvider: mockRequireAI,
}))

vi.mock('@molecule/api-ai-embeddings', () => ({
  requireProvider: mockRequireEmbeddings,
}))

vi.mock('@molecule/api-ai-vector-store', () => ({
  requireProvider: mockRequireVectors,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { answerQuestion, deleteDocument, indexDocument, retrieve } from '../pipeline.js'

function streamChunks(chunks: string[]) {
  return {
    async *[Symbol.asyncIterator]() {
      // Real ChatEvent text payload is `content` (see @molecule/api-ai types).
      for (const text of chunks) yield { type: 'text', content: text }
    },
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockRequireAI.mockReturnValue({ chat: mockChat })
  mockRequireEmbeddings.mockReturnValue({
    embedDocuments: mockEmbedDocuments,
    embedQuery: mockEmbedQuery,
  })
  mockRequireVectors.mockReturnValue({
    upsert: mockVectorUpsert,
    query: mockVectorQuery,
    delete: mockVectorDelete,
  })
})

describe('indexDocument', () => {
  it('chunks the text, embeds each chunk, and upserts to the right collection', async () => {
    const text = 'a'.repeat(2500) // 3 chunks at default 1000 chars / 200 overlap
    mockEmbedDocuments.mockResolvedValue([[0.1], [0.2], [0.3]])
    mockVectorUpsert.mockResolvedValue(undefined)
    const ids = await indexDocument({
      collection: 'docs',
      documentId: 'doc-1',
      text,
    })
    expect(mockEmbedDocuments).toHaveBeenCalledTimes(1)
    expect(mockVectorUpsert).toHaveBeenCalledTimes(1)
    const upsertArgs = mockVectorUpsert.mock.calls[0][0]
    expect(upsertArgs.collection).toBe('docs')
    expect(upsertArgs.records.length).toBe(ids.length)
    // IDs use `${documentId}::${i}` convention
    expect(ids[0]).toBe('doc-1::0')
    expect(ids[1]).toBe('doc-1::1')
  })

  it("stitches document_id + chunk_index into each record's metadata", async () => {
    mockEmbedDocuments.mockResolvedValue([[0.1]])
    mockVectorUpsert.mockResolvedValue(undefined)
    await indexDocument({
      collection: 'docs',
      documentId: 'd-9',
      text: 'short',
      metadata: { source: 'manual' },
    })
    const record = mockVectorUpsert.mock.calls[0][0].records[0]
    expect(record.metadata.document_id).toBe('d-9')
    expect(record.metadata.chunk_index).toBe(0)
    expect(record.metadata.source).toBe('manual') // user metadata preserved
  })

  it('returns [] without calling embed / upsert when text yields zero chunks', async () => {
    // Empty paragraph-only text → chunkText returns empty pieces filtered out.
    const ids = await indexDocument({
      collection: 'docs',
      documentId: 'doc-empty',
      text: '   \n\n   '.repeat(50),
      chunking: { maxChars: 30, overlap: 5 },
    })
    expect(ids).toEqual([])
    expect(mockEmbedDocuments).not.toHaveBeenCalled()
    expect(mockVectorUpsert).not.toHaveBeenCalled()
  })

  it('embeds in the order chunks were produced (vector_i aligns with chunk_i)', async () => {
    const text = 'X'.repeat(2500)
    const vectors = [[1], [2], [3]] as Array<number[]>
    mockEmbedDocuments.mockResolvedValue(vectors)
    mockVectorUpsert.mockResolvedValue(undefined)
    await indexDocument({ collection: 'docs', documentId: 'doc', text })
    const records = mockVectorUpsert.mock.calls[0][0].records
    for (let i = 0; i < records.length; i++) {
      expect(records[i].embedding).toBe(vectors[i])
    }
  })
})

describe('deleteDocument', () => {
  it('deletes maxChunks deterministic IDs from the right collection', async () => {
    mockVectorDelete.mockResolvedValue(undefined)
    await deleteDocument({ collection: 'docs', documentId: 'd-7', maxChunks: 5 })
    const args = mockVectorDelete.mock.calls[0][0]
    expect(args.collection).toBe('docs')
    expect(args.ids).toEqual(['d-7::0', 'd-7::1', 'd-7::2', 'd-7::3', 'd-7::4'])
  })

  it('defaults maxChunks to 1000 when omitted', async () => {
    mockVectorDelete.mockResolvedValue(undefined)
    await deleteDocument({ collection: 'docs', documentId: 'd-7' })
    expect(mockVectorDelete.mock.calls[0][0].ids.length).toBe(1000)
  })
})

describe('retrieve', () => {
  it('embeds the query and passes the right topK to the vector store', async () => {
    mockEmbedQuery.mockResolvedValue([0.5, 0.5])
    mockVectorQuery.mockResolvedValue([])
    await retrieve({ collection: 'docs', query: 'q', topK: 3 })
    expect(mockEmbedQuery).toHaveBeenCalledWith('q')
    const args = mockVectorQuery.mock.calls[0][0]
    expect(args.collection).toBe('docs')
    expect(args.embedding).toEqual([0.5, 0.5])
    expect(args.topK).toBe(3)
  })

  it('defaults topK to 5 when omitted', async () => {
    mockEmbedQuery.mockResolvedValue([])
    mockVectorQuery.mockResolvedValue([])
    await retrieve({ collection: 'docs', query: 'q' })
    expect(mockVectorQuery.mock.calls[0][0].topK).toBe(5)
  })

  it('forwards a metadata filter when provided', async () => {
    mockEmbedQuery.mockResolvedValue([])
    mockVectorQuery.mockResolvedValue([])
    const filter = [{ field: 'source', op: '=', value: 'manual' }] as never
    await retrieve({ collection: 'docs', query: 'q', filter })
    expect(mockVectorQuery.mock.calls[0][0].filter).toBe(filter)
  })

  it('maps vector hits to RetrievalHit shape (id/text/score/metadata)', async () => {
    mockEmbedQuery.mockResolvedValue([])
    mockVectorQuery.mockResolvedValue([
      {
        score: 0.95,
        record: { id: 'doc::0', content: 'hello', metadata: { source: 's' } },
      },
      {
        score: 0.42,
        record: { id: 'doc::1', content: null },
      },
    ])
    const hits = await retrieve({ collection: 'docs', query: 'q' })
    expect(hits[0]).toEqual({
      id: 'doc::0',
      text: 'hello',
      score: 0.95,
      metadata: { source: 's' },
    })
    // Null content should coerce to empty string (no undefined leaks)
    expect(hits[1].text).toBe('')
  })
})

describe('answerQuestion (end-to-end RAG)', () => {
  it('returns the "I don\'t know" answer with no AI call when retrieval is empty', async () => {
    mockEmbedQuery.mockResolvedValue([])
    mockVectorQuery.mockResolvedValue([])
    const out = await answerQuestion({ collection: 'docs', question: 'q?' })
    expect(out.answer).toBe("I don't know based on the provided sources.")
    expect(out.sources).toEqual([])
    expect(mockChat).not.toHaveBeenCalled()
  })

  it('numbers sources [1]..[N] in the prompt context block', async () => {
    mockEmbedQuery.mockResolvedValue([])
    mockVectorQuery.mockResolvedValue([
      { score: 1, record: { id: 'a::0', content: 'cats are felines.' } },
      { score: 0.9, record: { id: 'b::0', content: 'dogs are canines.' } },
    ])
    mockChat.mockReturnValue(streamChunks(['Both are domesticated mammals [1] [2].']))
    await answerQuestion({ collection: 'docs', question: 'what are cats and dogs?' })
    const prompt = mockChat.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('[1] cats are felines.')
    expect(prompt).toContain('[2] dogs are canines.')
  })

  it('substitutes both {{CONTEXT}} and {{QUESTION}} placeholders', async () => {
    mockEmbedQuery.mockResolvedValue([])
    mockVectorQuery.mockResolvedValue([{ score: 1, record: { id: 'a::0', content: 'src' } }])
    mockChat.mockReturnValue(streamChunks(['answer']))
    await answerQuestion({ collection: 'docs', question: 'WHAT?' })
    const prompt = mockChat.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('WHAT?')
    expect(prompt).not.toContain('{{CONTEXT}}')
    expect(prompt).not.toContain('{{QUESTION}}')
  })

  it('honours a custom promptTemplate', async () => {
    mockEmbedQuery.mockResolvedValue([])
    mockVectorQuery.mockResolvedValue([{ score: 1, record: { id: 'a::0', content: 'X' } }])
    mockChat.mockReturnValue(streamChunks(['ok']))
    await answerQuestion({
      collection: 'docs',
      question: 'q',
      promptTemplate: 'CTX={{CONTEXT}}\nQ={{QUESTION}}',
    })
    const prompt = mockChat.mock.calls[0][0].messages[0].content
    expect(prompt.startsWith('CTX=')).toBe(true)
    expect(prompt).toContain('Q=q')
  })

  it('defaults temperature to 0.2', async () => {
    mockEmbedQuery.mockResolvedValue([])
    mockVectorQuery.mockResolvedValue([{ score: 1, record: { id: 'a::0', content: 'X' } }])
    mockChat.mockReturnValue(streamChunks(['ok']))
    await answerQuestion({ collection: 'docs', question: 'q' })
    expect(mockChat.mock.calls[0][0].temperature).toBe(0.2)
  })

  it('honours explicit temperature and model overrides', async () => {
    mockEmbedQuery.mockResolvedValue([])
    mockVectorQuery.mockResolvedValue([{ score: 1, record: { id: 'a::0', content: 'X' } }])
    mockChat.mockReturnValue(streamChunks(['ok']))
    await answerQuestion({
      collection: 'docs',
      question: 'q',
      temperature: 0.7,
      model: 'claude-opus-4-7',
    })
    expect(mockChat.mock.calls[0][0].temperature).toBe(0.7)
    expect(mockChat.mock.calls[0][0].model).toBe('claude-opus-4-7')
  })

  it('estimates contextTokens as ~chars/4', async () => {
    mockEmbedQuery.mockResolvedValue([])
    // Use exactly 80 chars of content → "[1] " + 80 chars = 84 chars total
    mockVectorQuery.mockResolvedValue([
      { score: 1, record: { id: 'a::0', content: 'a'.repeat(80) } },
    ])
    mockChat.mockReturnValue(streamChunks(['ok']))
    const out = await answerQuestion({ collection: 'docs', question: 'q' })
    expect(out.contextTokens).toBe(Math.round(84 / 4))
  })

  it('aggregates AI streamed text chunks into the answer', async () => {
    mockEmbedQuery.mockResolvedValue([])
    mockVectorQuery.mockResolvedValue([{ score: 1, record: { id: 'a::0', content: 'X' } }])
    mockChat.mockReturnValue(streamChunks(['Part-A. ', 'Part-B.']))
    const out = await answerQuestion({ collection: 'docs', question: 'q' })
    expect(out.answer).toBe('Part-A. Part-B.')
  })

  it('ignores non-text events in the AI stream', async () => {
    mockEmbedQuery.mockResolvedValue([])
    mockVectorQuery.mockResolvedValue([{ score: 1, record: { id: 'a::0', content: 'X' } }])
    mockChat.mockReturnValue({
      async *[Symbol.asyncIterator]() {
        yield { type: 'tool_use', name: 'search' }
        yield { type: 'text', content: 'real-answer' }
        yield { type: 'end' }
      },
    })
    const out = await answerQuestion({ collection: 'docs', question: 'q' })
    expect(out.answer).toBe('real-answer')
  })

  it('uses the same retrieval topK as the explicit override', async () => {
    mockEmbedQuery.mockResolvedValue([])
    mockVectorQuery.mockResolvedValue([{ score: 1, record: { id: 'a::0', content: 'X' } }])
    mockChat.mockReturnValue(streamChunks(['ok']))
    await answerQuestion({ collection: 'docs', question: 'q', topK: 8 })
    expect(mockVectorQuery.mock.calls[0][0].topK).toBe(8)
  })
})
