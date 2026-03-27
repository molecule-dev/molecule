/**
 * Elasticsearch implementation of SearchProvider.
 *
 * Uses the `@elastic/elasticsearch` client to provide full-text search,
 * indexing, and suggestion capabilities backed by Elasticsearch or OpenSearch.
 *
 * @module
 */

import { Client } from '@elastic/elasticsearch'
import type {
  MappingProperty,
  QueryDslMultiMatchQuery,
  SearchHit as EsSearchHit,
  SearchRequest,
  Sort,
} from '@elastic/elasticsearch/lib/api/types'

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

import type { ElasticsearchOptions } from './types.js'

/** Map of molecule field types to Elasticsearch field mappings. */
const FIELD_TYPE_MAP: Record<string, MappingProperty> = {
  text: { type: 'text' },
  keyword: { type: 'keyword' },
  number: { type: 'double' },
  boolean: { type: 'boolean' },
  date: { type: 'date' },
  geo: { type: 'geo_point' },
}

/**
 * Resolves the full index name, applying the configured prefix if any.
 *
 * @param name - The base index name.
 * @param prefix - Optional index prefix.
 * @returns The resolved index name.
 */
const resolveIndex = (name: string, prefix?: string): string => {
  return prefix ? `${prefix}-${name}` : name
}

/**
 * Creates an Elasticsearch search provider instance.
 *
 * @param options - Provider configuration options.
 * @returns A fully configured `SearchProvider` implementation.
 */
export const createProvider = (options?: ElasticsearchOptions): SearchProvider => {
  const node = options?.node ?? process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200'
  const apiKey = options?.apiKey ?? process.env.ELASTICSEARCH_API_KEY
  const username = options?.username ?? process.env.ELASTICSEARCH_USERNAME
  const password = options?.password ?? process.env.ELASTICSEARCH_PASSWORD
  const requestTimeout = options?.requestTimeout ?? 30_000
  const maxRetries = options?.maxRetries ?? 3
  const indexPrefix = options?.indexPrefix

  const auth = apiKey ? { apiKey } : username && password ? { username, password } : undefined

  const client = new Client({
    node,
    auth,
    requestTimeout,
    maxRetries,
  })

  return {
    async createIndex(name: string, schema?: IndexSchema): Promise<void> {
      const indexName = resolveIndex(name, indexPrefix)

      if (schema) {
        const properties: Record<string, MappingProperty> = {}
        for (const [field, type] of Object.entries(schema.fields)) {
          properties[field] = FIELD_TYPE_MAP[type] ?? { type: 'text' }
        }
        await client.indices.create({
          index: indexName,
          mappings: { properties },
        })
      } else {
        await client.indices.create({ index: indexName })
      }
    },

    async deleteIndex(name: string): Promise<void> {
      const indexName = resolveIndex(name, indexPrefix)
      await client.indices.delete({ index: indexName })
    },

    async index(indexName: string, id: string, document: Record<string, unknown>): Promise<void> {
      await client.index({
        index: resolveIndex(indexName, indexPrefix),
        id,
        document,
        refresh: 'wait_for',
      })
    },

    async bulkIndex(indexName: string, documents: IndexDocument[]): Promise<BulkIndexResult> {
      const resolved = resolveIndex(indexName, indexPrefix)
      const operations = documents.flatMap((doc) => [
        { index: { _index: resolved, _id: doc.id } },
        doc.document,
      ])

      const response = await client.bulk({
        operations,
        refresh: 'wait_for',
      })

      const errors: Record<string, string> = {}
      let failed = 0

      if (response.errors) {
        for (const item of response.items) {
          const op = item.index
          if (op?.error) {
            failed++
            errors[op._id ?? 'unknown'] =
              typeof op.error === 'string' ? op.error : (op.error.reason ?? 'Unknown error')
          }
        }
      }

      return {
        indexed: documents.length - failed,
        failed,
        errors,
      }
    },

    async search(indexName: string, query: SearchQuery): Promise<SearchResult> {
      const resolved = resolveIndex(indexName, indexPrefix)
      const page = query.page ?? 1
      const perPage = query.perPage ?? 20
      const from = (page - 1) * perPage
      const startTime = Date.now()

      const boolQuery: Record<string, unknown> = {
        must: [{ multi_match: { query: query.text, type: 'best_fields' } }],
      }

      if (query.filters) {
        boolQuery.filter = Object.entries(query.filters).map(([field, value]) => ({
          term: { [field]: { value } },
        }))
      }

      const searchParams: SearchRequest = {
        index: resolved,
        query: { bool: boolQuery },
        from,
        size: perPage,
      }

      if (query.sort?.length) {
        searchParams.sort = query.sort.map((s) => ({
          [s.field]: { order: s.direction },
        })) as Sort
      }

      if (query.highlight) {
        searchParams.highlight = {
          fields: { '*': {} },
          pre_tags: ['<em>'],
          post_tags: ['</em>'],
        }
      }

      if (query.facets?.length) {
        searchParams.aggs = Object.fromEntries(
          query.facets.map((f) => [f, { terms: { field: f, size: 100 } }]),
        )
      }

      const response = await client.search(searchParams)

      const processingTimeMs = Date.now() - startTime

      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : (response.hits.total?.value ?? 0)

      const hits = response.hits.hits.map((hit: EsSearchHit<unknown>) => ({
        id: hit._id ?? '',
        score: hit._score ?? 0,
        document: (hit._source as Record<string, unknown>) ?? {},
        ...(hit.highlight ? { highlights: hit.highlight as Record<string, string[]> } : {}),
      }))

      const facets: Record<string, Array<{ value: string; count: number }>> = {}
      if (query.facets?.length && response.aggregations) {
        for (const facetName of query.facets) {
          const agg = response.aggregations[facetName] as
            | { buckets?: Array<{ key: string; doc_count: number }> }
            | undefined
          if (agg?.buckets) {
            facets[facetName] = agg.buckets.map((b) => ({
              value: String(b.key),
              count: b.doc_count,
            }))
          }
        }
      }

      return {
        hits,
        total,
        page,
        perPage,
        processingTimeMs,
        ...(Object.keys(facets).length ? { facets } : {}),
      }
    },

    async delete(indexName: string, id: string): Promise<void> {
      await client.delete({
        index: resolveIndex(indexName, indexPrefix),
        id,
        refresh: 'wait_for',
      })
    },

    async suggest(
      indexName: string,
      query: string,
      options?: SuggestOptions,
    ): Promise<Suggestion[]> {
      const resolved = resolveIndex(indexName, indexPrefix)
      const limit = options?.limit ?? 10

      const multiMatchQuery: QueryDslMultiMatchQuery = options?.fuzzy
        ? { query, fuzziness: 'AUTO', ...(options?.fields ? { fields: options.fields } : {}) }
        : { query, type: 'phrase_prefix', ...(options?.fields ? { fields: options.fields } : {}) }

      const response = await client.search({
        index: resolved,
        query: { multi_match: multiMatchQuery },
        size: limit,
      })

      return response.hits.hits.map((hit: EsSearchHit<unknown>) => ({
        text: getFirstTextField((hit._source as Record<string, unknown>) ?? {}),
        score: hit._score ?? 0,
      }))
    },

    async getDocument(indexName: string, id: string): Promise<Record<string, unknown> | null> {
      try {
        const response = await client.get({
          index: resolveIndex(indexName, indexPrefix),
          id,
        })
        return (response._source as Record<string, unknown>) ?? null
      } catch (error: unknown) {
        if (
          error &&
          typeof error === 'object' &&
          'statusCode' in error &&
          (error as { statusCode: number }).statusCode === 404
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
  for (const value of Object.values(source)) {
    if (typeof value === 'string') {
      return value
    }
  }
  return ''
}

let _provider: SearchProvider | undefined

/**
 * Default lazily-initialized Elasticsearch search provider.
 * Uses environment variables for configuration.
 */
export const provider: SearchProvider = new Proxy({} as SearchProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
