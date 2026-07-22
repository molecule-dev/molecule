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
  FieldType,
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
 * Only ever apply this to strings that become SQL identifiers (table/column
 * names) — never to a JSONB key you intend to look up with `document->>$n`.
 * A sanitized identifier and the real JSON key can diverge (`'product-type'`
 * becomes `'product_type'`), so filters/sorts/facets bind the raw field name
 * as a query parameter instead of interpolating a sanitized identifier.
 *
 * @param name - The identifier to sanitize.
 * @returns Sanitized identifier safe for SQL.
 */
const sanitizeIdentifier = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9_]/g, '_')
}

/**
 * Builds a prefix-matching `tsquery` expression from raw user search text.
 *
 * Each whitespace-separated token is emitted as a quoted lexeme (embedded
 * quotes and backslashes doubled, per PostgreSQL's tsquery quoting rules) so
 * punctuation or tsquery operators typed by a user (`!`, `(`, `)`, `:`, `&`,
 * `|`, `'`, …) can never produce a `syntax error in tsquery`. Tokens that
 * normalize to nothing (pure punctuation, stop words) are safely ignored by
 * PostgreSQL and simply match nothing.
 *
 * @param text - Raw search text as typed by the user.
 * @returns The tsquery expression, or `null` when the text contains no
 *   tokens (empty/whitespace-only input) — callers treat that as "browse"
 *   mode (match all documents) per the core `SearchQuery.text` contract.
 */
const buildTsQuery = (text: string): string | null => {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) {
    return null
  }
  return tokens
    .map((token) => `'${token.replace(/\\/g, '\\\\').replace(/'/g, "''")}':*`)
    .join(' & ')
}

/** SQL cast suffix applied to a JSONB field extracted as text, per declared `FieldType`. */
const CAST_FOR_SORT: Partial<Record<FieldType, string>> = {
  number: '::double precision',
  date: '::timestamptz',
  boolean: '::boolean',
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
  // Shared across every index created by this provider instance — stores the
  // schema.fields type map recorded at createIndex() time so search() can
  // cast sort fields to their declared type instead of always comparing text.
  const metaTable = sanitizeIdentifier(`${tablePrefix}schema_meta`)

  /**
   * Looks up the declared field types for an index from the schema metadata
   * table written by `createIndex()`. Used to cast JSONB values before
   * sorting so `number`/`date`/`boolean` fields order correctly instead of
   * lexicographically (`'10' < '9'` as text).
   *
   * @param table - The resolved (sanitized) SQL table name for the index.
   * @returns Map of field name to declared `FieldType`, or `{}` if no schema
   *   was recorded for this index — callers fall back to text-comparison
   *   sort, matching the pre-existing behavior.
   */
  const getFieldTypes = async (table: string): Promise<Record<string, FieldType>> => {
    try {
      const result = await query<{ fields: unknown }>(
        `SELECT fields FROM ${metaTable} WHERE table_name = $1`,
        [table],
      )
      const raw = result.rows[0]?.fields
      if (!raw) return {}
      return (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, FieldType>
    } catch (error) {
      // 42P01 = "relation does not exist": the schema-metadata table hasn't
      // been created yet, either because createIndex() was never called with
      // a schema, or this index predates this metadata table. Both are
      // legitimate, recoverable states — degrade to text-comparison sort
      // (the pre-existing behavior) instead of failing the whole search.
      // Any OTHER error (e.g. a real connectivity problem) is rethrown
      // rather than silently swallowed.
      if ((error as { code?: string } | undefined)?.code === '42P01') {
        return {}
      }
      throw error
    }
  }

  return {
    async createIndex(name: string, schema?: IndexSchema): Promise<void> {
      const table = tableName(name)

      await query(
        `CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, document JSONB NOT NULL, search_vector TSVECTOR, content TEXT NOT NULL DEFAULT '')`,
      )
      // Backfills `content` on tables created before this column existed.
      // No-op on a table that already has it (including one just created
      // above) — safe and cheap to run unconditionally.
      await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT ''`)

      if (useGinIndex) {
        await query(
          `CREATE INDEX IF NOT EXISTS idx_${table}_search ON ${table} USING GIN(search_vector)`,
        )
      }

      await query(
        `CREATE INDEX IF NOT EXISTS idx_${table}_document ON ${table} USING GIN(document)`,
      )

      if (schema && Object.keys(schema.fields).length > 0) {
        await query(
          `CREATE TABLE IF NOT EXISTS ${metaTable} (table_name TEXT PRIMARY KEY, fields JSONB NOT NULL)`,
        )
        await query(
          `INSERT INTO ${metaTable} (table_name, fields) VALUES ($1, $2)
           ON CONFLICT (table_name) DO UPDATE SET fields = $2`,
          [table, JSON.stringify(schema.fields)],
        )
      }
    },

    async deleteIndex(name: string): Promise<void> {
      const table = tableName(name)
      await query(`DROP TABLE IF EXISTS ${table} CASCADE`)

      try {
        await query(`DELETE FROM ${metaTable} WHERE table_name = $1`, [table])
      } catch (error) {
        // Same 42P01 rationale as getFieldTypes: no metadata table means no
        // metadata to clean up.
        if ((error as { code?: string } | undefined)?.code !== '42P01') {
          throw error
        }
      }
    },

    async index(indexName: string, id: string, document: Record<string, unknown>): Promise<void> {
      const table = tableName(indexName)
      const textContent = extractTextContent(document)

      await query(
        `INSERT INTO ${table} (id, document, search_vector, content)
         VALUES ($1, $2, to_tsvector($3, $4), $4)
         ON CONFLICT (id)
         DO UPDATE SET document = $2, search_vector = to_tsvector($3, $4), content = $4`,
        [id, JSON.stringify(document), searchConfig, textContent],
      )
    },

    async bulkIndex(indexName: string, documents: IndexDocument[]): Promise<BulkIndexResult> {
      const table = tableName(indexName)

      if (documents.length === 0) {
        return { indexed: 0, failed: 0, errors: {} }
      }

      const rows: string[] = []
      const params: unknown[] = []
      for (const doc of documents) {
        const textContent = extractTextContent(doc.document)
        const base = params.length
        rows.push(
          `($${base + 1}, $${base + 2}, to_tsvector($${base + 3}, $${base + 4}), $${base + 4})`,
        )
        params.push(doc.id, JSON.stringify(doc.document), searchConfig, textContent)
      }

      const batchSql = `INSERT INTO ${table} (id, document, search_vector, content)
        VALUES ${rows.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          document = EXCLUDED.document,
          search_vector = EXCLUDED.search_vector,
          content = EXCLUDED.content`

      try {
        await query(batchSql, params)
        return { indexed: documents.length, failed: 0, errors: {} }
      } catch (_error) {
        // One multi-row INSERT is far fewer round trips than N sequential
        // ones, but Postgres fails the WHOLE statement if any single row is
        // bad (constraint violation, malformed value). Fall back to
        // inserting one row at a time so callers still get per-document
        // indexed/failed/errors reporting instead of losing the entire
        // batch to one bad document — the failure information isn't lost,
        // it comes back in the returned BulkIndexResult.
        return await bulkIndexSequential(table, documents, searchConfig)
      }
    },

    async search(indexName: string, searchQuery: SearchQuery): Promise<SearchResult> {
      const table = tableName(indexName)
      const page = searchQuery.page ?? 1
      const perPage = searchQuery.perPage ?? 20
      const offset = (page - 1) * perPage
      const startTime = Date.now()

      const tsQuery = buildTsQuery(searchQuery.text)

      // whereParams/whereClause are shared by the data query, the COUNT
      // query, and every per-facet GROUP BY query below — kept as their own
      // self-contained, independently-numbered parameter list so all three
      // queries can reuse the exact same WHERE clause text.
      const whereParams: unknown[] = []
      let configParamIdx: number | undefined
      let queryParamIdx: number | undefined
      let whereClause: string

      if (tsQuery === null) {
        // Empty/whitespace-only search text is "browse" mode per the core
        // SearchProvider contract: match ALL documents (filters/sort/
        // pagination still apply) rather than erroring or returning zero
        // hits — consistent with the meilisearch/typesense bonds.
        whereClause = '1 = 1'
      } else {
        whereParams.push(searchConfig)
        configParamIdx = whereParams.length
        whereParams.push(tsQuery)
        queryParamIdx = whereParams.length
        whereClause = `search_vector @@ to_tsquery($${configParamIdx}, $${queryParamIdx})`
      }

      if (searchQuery.filters) {
        for (const [field, value] of Object.entries(searchQuery.filters)) {
          whereParams.push(field)
          const fieldParam = whereParams.length
          whereParams.push(value)
          const valueParam = whereParams.length
          // `::text` disambiguates the `jsonb ->> text | integer` overload
          // for a bound (unspecified-type) parameter.
          whereClause += ` AND document->>$${fieldParam}::text = $${valueParam}`
        }
      }

      const params: unknown[] = [...whereParams]
      let paramIndex = params.length + 1

      const rankExpr =
        queryParamIdx !== undefined
          ? `ts_rank(search_vector, to_tsquery($${configParamIdx}, $${queryParamIdx}))`
          : '0'

      let orderClause = queryParamIdx !== undefined ? `${rankExpr} DESC` : 'id ASC'
      if (searchQuery.sort?.length) {
        const fieldTypes = await getFieldTypes(table)
        orderClause = searchQuery.sort
          .map((s) => {
            params.push(s.field)
            const p = paramIndex++
            const cast = CAST_FOR_SORT[fieldTypes[s.field]] ?? ''
            return `(document->>$${p}::text)${cast} ${s.direction === 'asc' ? 'ASC' : 'DESC'}`
          })
          .join(', ')
      }

      // Highlighting needs an actual tsquery to highlight terms against —
      // there is nothing to highlight in browse mode (empty search text).
      const highlightSelect =
        searchQuery.highlight && queryParamIdx !== undefined
          ? `, ts_headline($${configParamIdx}, content, to_tsquery($${configParamIdx}, $${queryParamIdx}), 'StartSel=<em>, StopSel=</em>') AS headline`
          : ''

      const sql = `SELECT id, document, ${rankExpr} AS score${highlightSelect}
        FROM ${table}
        WHERE ${whereClause}
        ORDER BY ${orderClause}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}`

      params.push(perPage, offset)

      const countSql = `SELECT COUNT(*) AS total FROM ${table} WHERE ${whereClause}`

      const [dataResult, countResult] = await Promise.all([
        query<{ id: string; document: string; score: number; headline?: string }>(sql, params),
        query<{ total: string }>(countSql, whereParams),
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

      const facets: Record<string, Array<{ value: string; count: number }>> = {}
      if (searchQuery.facets?.length) {
        const facetEntries = await Promise.all(
          searchQuery.facets.map(async (field) => {
            const facetParams = [...whereParams, field]
            const fieldParamIdx = facetParams.length
            const facetSql = `SELECT document->>$${fieldParamIdx}::text AS value, COUNT(*) AS count
              FROM ${table}
              WHERE ${whereClause}
              GROUP BY 1
              ORDER BY 2 DESC
              LIMIT 100`
            const result = await query<{ value: string | null; count: string }>(
              facetSql,
              facetParams,
            )
            return [
              field,
              result.rows
                .filter((row): row is { value: string; count: string } => row.value !== null)
                .map((row) => ({ value: row.value, count: parseInt(row.count, 10) })),
            ] as const
          }),
        )
        for (const [field, counts] of facetEntries) {
          facets[field] = counts
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

      const tsQuery = buildTsQuery(queryText)
      if (tsQuery === null) {
        // Empty/whitespace-only input (common while a typeahead field is
        // being cleared): no suggestions rather than every document — this
        // is `suggest()`'s own partial-query contract and is intentionally
        // NOT the same as search()'s "browse mode" (a typeahead dropdown
        // showing every document on an empty field is not useful UX).
        return []
      }

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
 * Indexes documents one at a time, capturing a per-document error message
 * instead of failing the whole operation. Used as `bulkIndex()`'s fallback
 * when the fast multi-row INSERT fails (e.g. one malformed document).
 *
 * @param table - The resolved SQL table name.
 * @param documents - Documents to index.
 * @param searchConfig - PostgreSQL text search configuration (language).
 * @returns Result with indexed/failed counts and per-document errors.
 */
const bulkIndexSequential = async (
  table: string,
  documents: IndexDocument[],
  searchConfig: string,
): Promise<BulkIndexResult> => {
  const errors: Record<string, string> = {}
  let failed = 0

  for (const doc of documents) {
    try {
      const textContent = extractTextContent(doc.document)
      await query(
        `INSERT INTO ${table} (id, document, search_vector, content)
         VALUES ($1, $2, to_tsvector($3, $4), $4)
         ON CONFLICT (id)
         DO UPDATE SET document = $2, search_vector = to_tsvector($3, $4), content = $4`,
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
}

/**
 * Extracts the first text-like field value from a document for suggestion text.
 *
 * @param source - The document source object.
 * @returns The first string value found, or an empty string.
 */
const getFirstTextField = (source: Record<string, unknown>): string => {
  for (const [key, value] of Object.entries(source)) {
    // Skip the caller's own `id` field — a document id ("1") is never useful
    // suggestion text. Matches the meilisearch/typesense bonds so a provider
    // swap doesn't degrade typeahead suggestions to ids whenever callers
    // keep the id inside the indexed document.
    if (key === 'id') continue
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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
