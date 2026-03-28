/**
 * PostgreSQL full-text search implementation of SearchProvider.
 *
 * Uses PostgreSQL's built-in `tsvector`/`tsquery` full-text search capabilities
 * and the `@molecule/api-database` bond for database access.
 *
 * @module
 */

import { query } from '@molecule/api-database'
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

import type { PostgresSearchOptions } from './types.js'

/**
 * Sanitizes identifiers for use in SQL. Only allows alphanumeric and underscore.
 *
 * @param name - The identifier to sanitize.
 * @returns Sanitized identifier safe for SQL.
 */
const sanitizeIdentifier = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9_]/g, '_')
}

/**
 * Creates a PostgreSQL full-text search provider instance.
 *
 * @param options - Provider configuration options.
 * @returns A fully configured `SearchProvider` implementation.
 */
export const createProvider = (options?: PostgresSearchOptions): SearchProvider => {
  const searchConfig = options?.searchConfig ?? 'english'
  const tablePrefix = options?.tablePrefix ?? 'search_'
  const useGinIndex = options?.useGinIndex ?? true

  const tableName = (name: string): string => sanitizeIdentifier(`${tablePrefix}${name}`)

  return {
    async createIndex(name: string, schema?: IndexSchema): Promise<void> {
      const table = tableName(name)
      const searchableFields = schema?.searchableFields ?? []
      const filterableFields = schema?.filterableFields ?? []
      const allFields = new Set([...searchableFields, ...filterableFields])

      const columns = ['id TEXT PRIMARY KEY', 'document JSONB NOT NULL', `search_vector TSVECTOR`]

      if (schema?.fields) {
        for (const [field, type] of Object.entries(schema.fields)) {
          if (allFields.has(field)) {
            const pgType = mapFieldType(type)
            columns.push(`${sanitizeIdentifier(field)} ${pgType}`)
          }
        }
      }

      await query(`CREATE TABLE IF NOT EXISTS ${table} (${columns.join(', ')})`)

      if (useGinIndex) {
        await query(
          `CREATE INDEX IF NOT EXISTS idx_${table}_search ON ${table} USING GIN(search_vector)`,
        )
      }

      await query(
        `CREATE INDEX IF NOT EXISTS idx_${table}_document ON ${table} USING GIN(document)`,
      )
    },

    async deleteIndex(name: string): Promise<void> {
      const table = tableName(name)
      await query(`DROP TABLE IF EXISTS ${table} CASCADE`)
    },

    async index(indexName: string, id: string, document: Record<string, unknown>): Promise<void> {
      const table = tableName(indexName)
      const textContent = extractTextContent(document)

      await query(
        `INSERT INTO ${table} (id, document, search_vector)
         VALUES ($1, $2, to_tsvector($3, $4))
         ON CONFLICT (id)
         DO UPDATE SET document = $2, search_vector = to_tsvector($3, $4)`,
        [id, JSON.stringify(document), searchConfig, textContent],
      )
    },

    async bulkIndex(indexName: string, documents: IndexDocument[]): Promise<BulkIndexResult> {
      const table = tableName(indexName)
      const errors: Record<string, string> = {}
      let failed = 0

      for (const doc of documents) {
        try {
          const textContent = extractTextContent(doc.document)
          await query(
            `INSERT INTO ${table} (id, document, search_vector)
             VALUES ($1, $2, to_tsvector($3, $4))
             ON CONFLICT (id)
             DO UPDATE SET document = $2, search_vector = to_tsvector($3, $4)`,
            [doc.id, JSON.stringify(doc.document), searchConfig, textContent],
          )
        } catch (error: unknown) {
          failed++
          errors[doc.id] = error instanceof Error ? error.message : 'Unknown error'
        }
      }

      return {
        indexed: documents.length - failed,
        failed,
        errors,
      }
    },

    async search(indexName: string, searchQuery: SearchQuery): Promise<SearchResult> {
      const table = tableName(indexName)
      const page = searchQuery.page ?? 1
      const perPage = searchQuery.perPage ?? 20
      const offset = (page - 1) * perPage
      const startTime = Date.now()
      const params: unknown[] = []
      let paramIndex = 1

      const tsQuery = searchQuery.text
        .trim()
        .split(/\s+/)
        .map((word) => `${word}:*`)
        .join(' & ')

      params.push(searchConfig)
      const configParam = paramIndex++
      params.push(tsQuery)
      const queryParam = paramIndex++

      let whereClause = `search_vector @@ to_tsquery($${configParam}, $${queryParam})`

      if (searchQuery.filters) {
        for (const [field, value] of Object.entries(searchQuery.filters)) {
          params.push(value)
          whereClause += ` AND document->>'${sanitizeIdentifier(field)}' = $${paramIndex++}`
        }
      }

      let orderClause = `ts_rank(search_vector, to_tsquery($${configParam}, $${queryParam})) DESC`
      if (searchQuery.sort?.length) {
        orderClause = searchQuery.sort
          .map(
            (s) =>
              `document->>'${sanitizeIdentifier(s.field)}' ${s.direction === 'asc' ? 'ASC' : 'DESC'}`,
          )
          .join(', ')
      }

      const highlightSelect = searchQuery.highlight
        ? `, ts_headline($${configParam}, document::text, to_tsquery($${configParam}, $${queryParam}), 'StartSel=<em>, StopSel=</em>') AS headline`
        : ''

      const sql = `SELECT id, document, ts_rank(search_vector, to_tsquery($${configParam}, $${queryParam})) AS score${highlightSelect}
        FROM ${table}
        WHERE ${whereClause}
        ORDER BY ${orderClause}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}`

      params.push(perPage, offset)

      const countSql = `SELECT COUNT(*) AS total FROM ${table} WHERE ${whereClause}`
      const countParams = params.slice(0, paramIndex - 3)

      const [dataResult, countResult] = await Promise.all([
        query<{ id: string; document: string; score: number; headline?: string }>(sql, params),
        query<{ total: string }>(countSql, countParams),
      ])

      const processingTimeMs = Date.now() - startTime
      const total = parseInt(countResult.rows[0]?.total ?? '0', 10)

      const hits = dataResult.rows.map((row) => {
        const doc = typeof row.document === 'string' ? JSON.parse(row.document) : row.document
        const result: {
          id: string
          score: number
          document: Record<string, unknown>
          highlights?: Record<string, string[]>
        } = {
          id: row.id,
          score: row.score,
          document: doc,
        }

        if (searchQuery.highlight && row.headline) {
          result.highlights = { _content: [row.headline] }
        }

        return result
      })

      return {
        hits,
        total,
        page,
        perPage,
        processingTimeMs,
      }
    },

    async delete(indexName: string, id: string): Promise<void> {
      const table = tableName(indexName)
      await query(`DELETE FROM ${table} WHERE id = $1`, [id])
    },

    async suggest(
      indexName: string,
      queryText: string,
      options?: SuggestOptions,
    ): Promise<Suggestion[]> {
      const table = tableName(indexName)
      const limit = options?.limit ?? 10

      const tsQuery = queryText
        .trim()
        .split(/\s+/)
        .map((word) => `${word}:*`)
        .join(' & ')

      const sql = `SELECT id, document, ts_rank(search_vector, to_tsquery($1, $2)) AS score
        FROM ${table}
        WHERE search_vector @@ to_tsquery($1, $2)
        ORDER BY score DESC
        LIMIT $3`

      const result = await query<{ id: string; document: string; score: number }>(sql, [
        searchConfig,
        tsQuery,
        limit,
      ])

      return result.rows.map((row) => {
        const doc = typeof row.document === 'string' ? JSON.parse(row.document) : row.document
        return {
          text: getFirstTextField(doc),
          score: row.score,
        }
      })
    },

    async getDocument(indexName: string, id: string): Promise<Record<string, unknown> | null> {
      const table = tableName(indexName)
      const result = await query<{ document: string }>(
        `SELECT document FROM ${table} WHERE id = $1`,
        [id],
      )

      if (result.rows.length === 0) {
        return null
      }

      const doc = result.rows[0].document
      return typeof doc === 'string' ? JSON.parse(doc) : doc
    },
  }
}

/**
 * Extracts all text content from a document for indexing.
 *
 * @param document - The document to extract text from.
 * @returns Concatenated text content from all string fields.
 */
const extractTextContent = (document: Record<string, unknown>): string => {
  const parts: string[] = []
  for (const value of Object.values(document)) {
    if (typeof value === 'string') {
      parts.push(value)
    } else if (Array.isArray(value)) {
      parts.push(value.filter((v) => typeof v === 'string').join(' '))
    }
  }
  return parts.join(' ')
}

/**
 * Maps a molecule FieldType to a PostgreSQL column type.
 *
 * @param type - The molecule field type.
 * @returns The corresponding PostgreSQL type.
 */
const mapFieldType = (type: string): string => {
  const map: Record<string, string> = {
    text: 'TEXT',
    keyword: 'TEXT',
    number: 'DOUBLE PRECISION',
    boolean: 'BOOLEAN',
    date: 'TIMESTAMPTZ',
    geo: 'POINT',
  }
  return map[type] ?? 'TEXT'
}

/**
 * Extracts the first text-like field value from a document for suggestion text.
 *
 * @param source - The document source object.
 * @returns The first string value found, or an empty string.
 */
const getFirstTextField = (source: Record<string, unknown>): string => {
  for (const value of Object.values(source)) {
    if (typeof value === 'string') return value
  }
  return ''
}

let _provider: SearchProvider | undefined

/**
 * Default lazily-initialized PostgreSQL search provider.
 * Uses the bonded database pool for queries.
 */
export const provider: SearchProvider = new Proxy({} as SearchProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
