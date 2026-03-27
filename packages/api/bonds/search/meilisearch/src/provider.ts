/**
 * Meilisearch implementation of SearchProvider.
 *
 * Uses the `meilisearch` client to provide full-text search, indexing,
 * and suggestion capabilities backed by Meilisearch.
 *
 * @module
 */

import type { Hit, RecordAny, SearchParams } from 'meilisearch'
import { MeiliSearch } from 'meilisearch'

import type {
  BulkIndexResult,
  IndexDocument,
  IndexSchema,
  SearchProvider,
  SearchQuery,
  SearchResult,
  Suggestion,
  SuggestOptions,
} from '@molecule/api-search'

import type { MeilisearchOptions } from './types.js'

/**
 * Creates a Meilisearch search provider instance.
 *
 * @param options - Provider configuration options.
 * @returns A fully configured `SearchProvider` implementation.
 */
export const createProvider = (options?: MeilisearchOptions): SearchProvider => {
  const host = options?.host ?? process.env.MEILISEARCH_URL ?? 'http://localhost:7700'
  const apiKey = options?.apiKey ?? process.env.MEILISEARCH_API_KEY ?? ''

  const client = new MeiliSearch({ host, apiKey })

  return {
    async createIndex(name: string, schema?: IndexSchema): Promise<void> {
      await client.createIndex(name, { primaryKey: 'id' }).waitTask()

      if (schema) {
        const index = client.index(name)
        const updates: Array<Promise<unknown>> = []

        if (schema.searchableFields?.length) {
          updates.push(index.updateSearchableAttributes(schema.searchableFields).waitTask())
        }
        if (schema.filterableFields?.length) {
          updates.push(index.updateFilterableAttributes(schema.filterableFields).waitTask())
        }
        if (schema.sortableFields?.length) {
          updates.push(index.updateSortableAttributes(schema.sortableFields).waitTask())
        }

        await Promise.all(updates)
      }
    },

    async deleteIndex(name: string): Promise<void> {
      await client.deleteIndex(name).waitTask()
    },

    async index(indexName: string, id: string, document: Record<string, unknown>): Promise<void> {
      const index = client.index(indexName)
      await index.addDocuments([{ id, ...document }]).waitTask()
    },

    async bulkIndex(indexName: string, documents: IndexDocument[]): Promise<BulkIndexResult> {
      const index = client.index(indexName)
      const docs = documents.map((d) => ({ id: d.id, ...d.document }))

      try {
        await index.addDocuments(docs).waitTask()
        return { indexed: documents.length, failed: 0, errors: {} }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return {
          indexed: 0,
          failed: documents.length,
          errors: Object.fromEntries(documents.map((d) => [d.id, message])),
        }
      }
    },

    async search(indexName: string, query: SearchQuery): Promise<SearchResult> {
      const index = client.index(indexName)
      const page = query.page ?? 1
      const perPage = query.perPage ?? 20
      const startTime = Date.now()

      const params: SearchParams = {
        limit: perPage,
        offset: (page - 1) * perPage,
      }

      if (query.filters) {
        const filterParts = Object.entries(query.filters).map(
          ([field, value]) => `${field} = "${String(value)}"`,
        )
        params.filter = filterParts
      }

      if (query.sort?.length) {
        params.sort = query.sort.map((s) => `${s.field}:${s.direction}`)
      }

      if (query.highlight) {
        params.attributesToHighlight = ['*']
        params.highlightPreTag = '<em>'
        params.highlightPostTag = '</em>'
      }

      if (query.facets?.length) {
        params.facets = query.facets
      }

      const response = await index.search(query.text, params)
      const processingTimeMs = Date.now() - startTime

      const hits = (response.hits ?? []).map((hit: Hit<RecordAny>) => {
        const {
          _formatted,
          _matchesPosition,
          _rankingScore,
          _rankingScoreDetails,
          _federation,
          ...document
        } = hit
        const result: {
          id: string
          score: number
          document: Record<string, unknown>
          highlights?: Record<string, string[]>
        } = {
          id: String(document.id ?? ''),
          score: typeof _rankingScore === 'number' ? _rankingScore : 0,
          document,
        }

        if (query.highlight && _formatted) {
          const highlights: Record<string, string[]> = {}
          for (const [field, value] of Object.entries(_formatted)) {
            if (typeof value === 'string' && value.includes('<em>')) {
              highlights[field] = [value]
            }
          }
          if (Object.keys(highlights).length) {
            result.highlights = highlights
          }
        }

        return result
      })

      const facets: Record<string, Array<{ value: string; count: number }>> | undefined =
        response.facetDistribution
          ? Object.fromEntries(
              Object.entries(response.facetDistribution).map(([field, distribution]) => [
                field,
                Object.entries(distribution).map(([value, count]) => ({
                  value,
                  count,
                })),
              ]),
            )
          : undefined

      return {
        hits,
        total: response.estimatedTotalHits ?? hits.length,
        page,
        perPage,
        processingTimeMs,
        ...(facets ? { facets } : {}),
      }
    },

    async delete(indexName: string, id: string): Promise<void> {
      const index = client.index(indexName)
      await index.deleteDocument(id).waitTask()
    },

    async suggest(
      indexName: string,
      queryText: string,
      options?: SuggestOptions,
    ): Promise<Suggestion[]> {
      const index = client.index(indexName)
      const limit = options?.limit ?? 10

      const params: SearchParams = { limit }
      if (options?.fields) {
        params.attributesToSearchOn = options.fields
      }

      const response = await index.search(queryText, params)

      return (response.hits ?? []).map((hit: Hit<RecordAny>) => ({
        text: getFirstTextField(hit),
        score: typeof hit._rankingScore === 'number' ? hit._rankingScore : 0,
      }))
    },

    async getDocument(indexName: string, id: string): Promise<Record<string, unknown> | null> {
      const index = client.index(indexName)
      try {
        const doc = await index.getDocument(id)
        const { id: _id, ...rest } = doc as Record<string, unknown>
        return rest
      } catch (error: unknown) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          (error as { code: string }).code === 'document_not_found'
        ) {
          return null
        }
        throw error
      }
    },
  }
}

/**
 * Extracts the first text-like field value from a document for suggestion text.
 *
 * @param source - The document source object.
 * @returns The first string value found, or an empty string.
 */
const getFirstTextField = (source: Record<string, unknown>): string => {
  for (const [key, value] of Object.entries(source)) {
    if (key === 'id' || key.startsWith('_')) continue
    if (typeof value === 'string') return value
  }
  return ''
}

let _provider: SearchProvider | undefined

/**
 * Default lazily-initialized Meilisearch search provider.
 * Uses environment variables for configuration.
 */
export const provider: SearchProvider = new Proxy({} as SearchProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
