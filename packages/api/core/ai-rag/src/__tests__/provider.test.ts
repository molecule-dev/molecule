import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AIProvider, ChatEvent, ChatParams } from '@molecule/api-ai'
import { bond, configure, reset } from '@molecule/api-bond'
import type { SearchHit } from '@molecule/api-semantic-search'
import { indexDocuments, removeDocuments, search } from '@molecule/api-semantic-search'

import { getProvider, hasProvider, provider, requireProvider, setProvider } from '../provider.js'

// Mock the retrieval layer so these tests are deterministic and need no
// embeddings / vector-store bonds — RAG's own contract is the composition.
vi.mock('@molecule/api-semantic-search', () => ({
  indexDocuments: vi.fn(),
  search: vi.fn(),
  removeDocuments: vi.fn(),
}))

const mockedIndex = vi.mocked(indexDocuments)
const mockedSearch = vi.mocked(search)
const mockedRemove = vi.mocked(removeDocuments)

// The chat params the fake AI provider last received — asserted to prove the
// retrieved context and grounding system prompt are actually fed to the model.
let capturedChat: ChatParams | undefined

/**
 * Builds a fake AI provider that yields a fixed answer + usage. Records the
 * params it was called with in `capturedChat`.
 */
function makeAI(answer: string, name = 'fake'): AIProvider {
  return {
    name,
    async *chat(params: ChatParams): AsyncIterable<ChatEvent> {
      capturedChat = params
      yield { type: 'text', content: answer }
      yield { type: 'done', usage: { inputTokens: 11, outputTokens: 7 } }
    },
  }
}

const HIT: SearchHit = {
  id: 'pto',
  score: 0.92,
  content: 'Employees accrue 15 PTO days per year.',
  metadata: { topic: 'benefits' },
}

describe('ai-rag provider', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
    capturedChat = undefined
    mockedIndex.mockReset().mockResolvedValue({ indexed: 0, dimension: 0 })
    mockedSearch.mockReset().mockResolvedValue([])
    mockedRemove.mockReset().mockResolvedValue(undefined)
  })

  // -------------------------------------------------------------------------
  // Bond accessor
  // -------------------------------------------------------------------------

  describe('accessor', () => {
    it('starts unbonded', () => {
      expect(hasProvider()).toBe(false)
      expect(getProvider()).toBeNull()
    })

    it('requireProvider throws when nothing is bonded', () => {
      expect(() => requireProvider()).toThrow(/not configured/i)
    })

    it('setProvider then getProvider/requireProvider returns the bonded instance', () => {
      setProvider(provider)
      expect(hasProvider()).toBe(true)
      expect(getProvider()).toBe(provider)
      expect(requireProvider()).toBe(provider)
    })

    it('bond("ai-rag", provider) is resolvable via the accessor', () => {
      bond('ai-rag', provider)
      expect(requireProvider()).toBe(provider)
    })
  })

  // -------------------------------------------------------------------------
  // ingest
  // -------------------------------------------------------------------------

  describe('ingest', () => {
    it('forwards to indexDocuments and returns its result', async () => {
      mockedIndex.mockResolvedValue({ indexed: 2, dimension: 4 })
      const documents = [
        { id: 'a', text: 'alpha', metadata: { k: 1 } },
        { id: 'b', text: 'beta' },
      ]

      const result = await provider.ingest({ collection: 'docs', documents, model: 'embed-model' })

      expect(mockedIndex).toHaveBeenCalledWith({
        collection: 'docs',
        documents,
        model: 'embed-model',
      })
      expect(result).toEqual({ indexed: 2, dimension: 4 })
    })
  })

  // -------------------------------------------------------------------------
  // query
  // -------------------------------------------------------------------------

  describe('query', () => {
    it('retrieves with topK and feeds the numbered context + question to the model', async () => {
      mockedSearch.mockResolvedValue([HIT])
      bond('ai', makeAI('You accrue 15 PTO days per year [1].'))

      const result = await provider.query({
        collection: 'handbook',
        query: 'How many PTO days do I get?',
        topK: 3,
      })

      // retrieval forwarded correctly
      expect(mockedSearch).toHaveBeenCalledWith({
        collection: 'handbook',
        query: 'How many PTO days do I get?',
        topK: 3,
        filter: undefined,
        minScore: undefined,
      })

      // grounded answer + sources + usage returned
      expect(result.answer).toBe('You accrue 15 PTO days per year [1].')
      expect(result.sources).toEqual([HIT])
      expect(result.usage).toEqual({ inputTokens: 11, outputTokens: 7 })

      // the retrieved context and grounding prompt actually reached the model
      expect(capturedChat?.stream).toBe(false)
      expect(capturedChat?.system).toContain('Cite sources as [n]')
      const userContent = capturedChat?.messages[0].content as string
      expect(userContent).toContain('[1] Employees accrue 15 PTO days per year.')
      expect(userContent).toContain('How many PTO days do I get?')
    })

    it('defaults topK to 5 when omitted', async () => {
      bond('ai', makeAI('answer'))
      await provider.query({ collection: 'docs', query: 'q' })
      expect(mockedSearch).toHaveBeenCalledWith(expect.objectContaining({ topK: 5 }))
    })

    it('forwards filter, minScore, and abort signal', async () => {
      bond('ai', makeAI('answer'))
      const controller = new AbortController()
      await provider.query({
        collection: 'docs',
        query: 'q',
        filter: [{ field: 'topic', operator: 'eq', value: 'benefits' }],
        minScore: 0.5,
        signal: controller.signal,
      })
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: [{ field: 'topic', operator: 'eq', value: 'benefits' }],
          minScore: 0.5,
        }),
      )
      expect(capturedChat?.signal).toBe(controller.signal)
    })

    it('appends extra system guidance', async () => {
      mockedSearch.mockResolvedValue([HIT])
      bond('ai', makeAI('answer'))
      await provider.query({ collection: 'docs', query: 'q', system: 'Reply in French.' })
      expect(capturedChat?.system).toContain('Reply in French.')
    })

    it('still calls the model on zero hits, with empty-context guidance', async () => {
      mockedSearch.mockResolvedValue([])
      bond('ai', makeAI("I don't have information on that."))

      const result = await provider.query({ collection: 'docs', query: 'unknown?' })

      expect(result.sources).toEqual([])
      expect(result.answer).toBe("I don't have information on that.")
      expect(capturedChat?.system).toContain('context is empty')
    })

    it('uses a named AI provider when input.provider is set', async () => {
      mockedSearch.mockResolvedValue([HIT])
      bond('ai', 'anthropic', makeAI('from anthropic', 'anthropic'))
      bond('ai', 'openai', makeAI('from openai', 'openai'))

      const result = await provider.query({
        collection: 'docs',
        query: 'q',
        provider: 'openai',
      })
      expect(result.answer).toBe('from openai')
    })

    it('throws a clear error when the named AI provider is not bonded', async () => {
      bond('ai', makeAI('answer'))
      await expect(
        provider.query({ collection: 'docs', query: 'q', provider: 'missing' }),
      ).rejects.toThrow(/missing/)
    })

    it('throws when no AI provider is bonded at all', async () => {
      mockedSearch.mockResolvedValue([HIT])
      await expect(provider.query({ collection: 'docs', query: 'q' })).rejects.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // remove
  // -------------------------------------------------------------------------

  describe('remove', () => {
    it('forwards the ids to removeDocuments', async () => {
      await provider.remove({ collection: 'docs', ids: ['a', 'b'] })
      expect(mockedRemove).toHaveBeenCalledWith({ collection: 'docs', ids: ['a', 'b'] })
    })
  })
})
