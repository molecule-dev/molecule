/**
 * Typesense implementation of SearchProvider.
 *
 * Uses the `typesense` client to provide full-text search, indexing,
 * and suggestion capabilities backed by Typesense.
 *
 * @module
 */

import Typesense from 'typesense'

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

import type { TypesenseOptions } from './types.js'

/** Map of molecule field types to Typesense field types. */
const FIELD_TYPE_MAP: Record<string, string> = {
  text: 'string',
  keyword: 'string',
  number: 'float',
  boolean: 'bool',
  date: 'int64',
  geo: 'geopoint',
}

/**
 * Creates a Typesense search provider instance.
 *
 * @param options - Provider configuration options.
 * @returns A fully configured `SearchProvider` implementation.
 */
export const createProvider = (options?: TypesenseOptions): SearchProvider => {
  const nodes = options?.nodes ?? [
    {
      host: process.env.TYPESENSE_HOST ?? 'localhost',
      port: Number(process.env.TYPESENSE_PORT ?? 8108),
      protocol: process.env.TYPESENSE_PROTOCOL ?? 'http',
    },
  ]
  const apiKey = options?.apiKey ?? process.env.TYPESENSE_API_KEY ?? ''
  const connectionTimeoutSeconds = options?.connectionTimeoutSeconds ?? 5
  const numRetries = options?.numRetries ?? 3

  const client = new Typesense.Client({
    nodes,
    apiKey,
    connectionTimeoutSeconds,
    numRetries,
  })

  return {
    async createIndex(name: string, schema?: IndexSchema): Promise<void> {
      const fields: Array<{ name: string; type: string; facet?: boolean; sort?: boolean }> = []

      if (schema) {
        for (const [field, type] of Object.entries(schema.fields)) {
          fields.push({
            name: field,
            type: FIELD_TYPE_MAP[type] ?? 'string',
            facet: schema.filterableFields?.includes(field) ?? false,
            sort: schema.sortableFields?.includes(field) ?? false,
          })
        }
      } else {
        fields.push({ name: '.*', type: 'auto' })
      }

      await client.collections().create({
        name,
        fields: fields as never[],
        enable_nested_fields: true,
      })
    },

    async deleteIndex(name: string): Promise<void> {
      await client.collections(name).delete()
    },

    async index(indexName: string, id: string, document: Record<string, unknown>): Promise<void> {
      await client
        .collections(indexName)
        .documents()
        .upsert({ id, ...document })
    },

    async bulkIndex(indexName: string, documents: IndexDocument[]): Promise<BulkIndexResult> {
      const docs = documents.map((d) => ({ id: d.id, ...d.document }))
      const results = await client
        .collections(indexName)
        .documents()
        .import(docs as never[], { action: 'upsert' })

      const errors: Record<string, string> = {}
      let failed = 0

      for (const result of results as Array<{
        success: boolean
        document?: { id?: string }
        error?: string
      }>) {
        if (!result.success) {
          failed++
          errors[result.document?.id ?? 'unknown'] = result.error ?? 'Unknown error'
        }
      }

      return {
        indexed: documents.length - failed,
        failed,
        errors,
      }
    },

    async search(indexName: string, query: SearchQuery): Promise<SearchResult> {
      const page = query.page ?? 1
      const perPage = query.perPage ?? 20
      const startTime = Date.now()

      const params: Record<string, unknown> = {
        q: query.text,
        query_by: '*',
        per_page: perPage,
        page,
      }

      if (query.filters) {
        const filterParts = Object.entries(query.filters).map(
          ([field, value]) => `${field}:=${String(value)}`,
        )
        params.filter_by = filterParts.join(' && ')
      }

      if (query.sort?.length) {
        params.sort_by = query.sort.map((s) => `${s.field}:${s.direction}`).join(',')
      }

      if (query.highlight) {
        params.highlight_full_fields = '*'
      }

      if (query.facets?.length) {
        params.facet_by = query.facets.join(',')
      }

      const response = await client
        .collections(indexName)
        .documents()
        .search(params as never)
      const processingTimeMs = Date.now() - startTime

      const rawHits = (response.hits ?? []) as unknown as Array<Record<string, unknown>>
      const hits = rawHits.map((hit) => {
        const doc = (hit.document as Record<string, unknown>) ?? {}
        const { id, ...document } = doc
        const result: {
          id: string
          score: number
          document: Record<string, unknown>
          highlights?: Record<string, string[]>
        } = {
          id: String(id ?? ''),
          score: typeof hit.text_match === 'number' ? hit.text_match : 0,
          document,
        }

        if (query.highlight && Array.isArray(hit.highlights)) {
          const highlights: Record<string, string[]> = {}
          for (const h of hit.highlights as Array<{ field: string; snippet: string }>) {
            highlights[h.field] = [h.snippet]
          }
          if (Object.keys(highlights).length) {
            result.highlights = highlights
          }
        }

        return result
      })

      const facets: Record<string, Array<{ value: string; count: number }>> | undefined = response
        .facet_counts?.length
        ? Object.fromEntries(
            (
              response.facet_counts as Array<{
                field_name: string
                counts: Array<{ value: string; count: number }>
              }>
            ).map((fc) => [
              fc.field_name,
              fc.counts.map((c) => ({ value: c.value, count: c.count })),
            ]),
          )
        : undefined

      return {
        hits,
        total: response.found ?? 0,
        page,
        perPage,
        processingTimeMs,
        ...(facets ? { facets } : {}),
      }
    },

    async delete(indexName: string, id: string): Promise<void> {
      await client.collections(indexName).documents(id).delete()
    },

    async suggest(
      indexName: string,
      query: string,
      options?: SuggestOptions,
    ): Promise<Suggestion[]> {
      const limit = options?.limit ?? 10

      const params: Record<string, unknown> = {
        q: query,
        query_by: options?.fields?.join(',') ?? '*',
        per_page: limit,
        prefix: true,
      }

      if (options?.fuzzy) {
        params.num_typos = 2
      }

      const response = await client
        .collections(indexName)
        .documents()
        .search(params as never)
      const suggestHits = (response.hits ?? []) as unknown as Array<Record<string, unknown>>

      return suggestHits.map((hit) => {
        const doc = (hit.document as Record<string, unknown>) ?? {}
        return {
          text: getFirstTextField(doc),
          score: typeof hit.text_match === 'number' ? hit.text_match : 0,
        }
      })
    },

    async getDocument(indexName: string, id: string): Promise<Record<string, unknown> | null> {
      try {
        const doc = (await client
          .collections(indexName)
          .documents(id)
          .retrieve()) as unknown as Record<string, unknown>
        const { id: _id, ...rest } = doc
        return rest
      } catch (error: unknown) {
        if (
          error &&
          typeof error === 'object' &&
          'httpStatus' in error &&
          (error as { httpStatus: number }).httpStatus === 404
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
    if (key === 'id') continue
    if (typeof value === 'string') return value
  }
  return ''
}

let _provider: SearchProvider | undefined

/**
 * Default lazily-initialized Typesense search provider.
 * Uses environment variables for configuration.
 */
export const provider: SearchProvider = new Proxy({} as SearchProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
