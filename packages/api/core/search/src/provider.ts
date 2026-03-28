/**
 * Search provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-search-elasticsearch`) call `setProvider()` during setup.
 * Application code uses the convenience functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  BulkIndexResult,
  IndexDocument,
  IndexSchema,
  SearchProvider,
  SearchQuery,
  SearchResult,
  Suggestion,
  SuggestOptions,
} from './types.js'

const BOND_TYPE = 'search'
expectBond(BOND_TYPE)

/**
 * Registers a search provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The search provider implementation to bond.
 */
export const setProvider = (provider: SearchProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded search provider, throwing if none is configured.
 *
 * @returns The bonded search provider.
 * @throws {Error} If no search provider has been bonded.
 */
export const getProvider = (): SearchProvider => {
  try {
    return bondRequire<SearchProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('search.error.noProvider', undefined, {
        defaultValue: 'Search provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a search provider is currently bonded.
 *
 * @returns `true` if a search provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Creates a search index with an optional schema.
 *
 * @param name - Index name.
 * @param schema - Optional schema describing field types and roles.
 * @returns A promise that resolves when the index has been created.
 * @throws {Error} If no search provider has been bonded.
 */
export const createIndex = async (name: string, schema?: IndexSchema): Promise<void> => {
  return getProvider().createIndex(name, schema)
}

/**
 * Deletes a search index and all its documents.
 *
 * @param name - Index name to delete.
 * @returns A promise that resolves when the index has been deleted.
 * @throws {Error} If no search provider has been bonded.
 */
export const deleteIndex = async (name: string): Promise<void> => {
  return getProvider().deleteIndex(name)
}

/**
 * Indexes a single document.
 *
 * @param indexName - Target index name.
 * @param id - Unique document identifier.
 * @param document - The document fields and values.
 * @returns A promise that resolves when the document has been indexed.
 * @throws {Error} If no search provider has been bonded.
 */
export const index = async (
  indexName: string,
  id: string,
  document: Record<string, unknown>,
): Promise<void> => {
  return getProvider().index(indexName, id, document)
}

/**
 * Indexes multiple documents in a single operation.
 *
 * @param indexName - Target index name.
 * @param documents - Array of documents to index.
 * @returns Result with indexed/failed counts and errors.
 * @throws {Error} If no search provider has been bonded.
 */
export const bulkIndex = async (
  indexName: string,
  documents: IndexDocument[],
): Promise<BulkIndexResult> => {
  return getProvider().bulkIndex(indexName, documents)
}

/**
 * Executes a full-text search query against an index.
 *
 * @param indexName - Index to search.
 * @param query - Search query with text, filters, pagination, etc.
 * @returns Search results with hits, total count, facets, and timing.
 * @throws {Error} If no search provider has been bonded.
 */
export const search = async (indexName: string, query: SearchQuery): Promise<SearchResult> => {
  return getProvider().search(indexName, query)
}

/**
 * Deletes a document from an index by id.
 *
 * @param indexName - Index containing the document.
 * @param id - Document identifier to delete.
 * @returns A promise that resolves when the document has been deleted.
 * @throws {Error} If no search provider has been bonded.
 */
export const deleteDocument = async (indexName: string, id: string): Promise<void> => {
  return getProvider().delete(indexName, id)
}

/**
 * Returns typeahead/autocomplete suggestions for a partial query.
 *
 * @param indexName - Index to generate suggestions from.
 * @param query - Partial text to complete.
 * @param options - Suggestion options (limit, fields, fuzzy).
 * @returns Array of suggestions sorted by relevance.
 * @throws {Error} If no search provider has been bonded.
 */
export const suggest = async (
  indexName: string,
  query: string,
  options?: SuggestOptions,
): Promise<Suggestion[]> => {
  return getProvider().suggest(indexName, query, options)
}

/**
 * Retrieves a single document from an index by id.
 *
 * @param indexName - Index containing the document.
 * @param id - Document identifier.
 * @returns The document fields, or `null` if not found.
 * @throws {Error} If no search provider has been bonded.
 */
export const getDocument = async (
  indexName: string,
  id: string,
): Promise<Record<string, unknown> | null> => {
  return getProvider().getDocument(indexName, id)
}
