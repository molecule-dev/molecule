/**
 * MiniSearch-backed client search provider.
 *
 * @module
 */

import MiniSearch from 'minisearch'

import type {
  ClientSearchDocument,
  ClientSearchHit,
  ClientSearchIndex,
  ClientSearchIndexOptions,
  ClientSearchProvider,
  ClientSearchQuery,
} from '@molecule/app-client-search'
import {
  extractFieldText,
  filterFieldsOf,
  matchesFilters,
  matchesText,
  parseQuery,
} from '@molecule/app-client-search'

import type { MinisearchConfig } from './types.js'

/**
 * One index: MiniSearch for the text, plus the original documents kept by id
 * so hits return them untouched and filters read real values, not tokens.
 */
class MinisearchIndex<T extends ClientSearchDocument> implements ClientSearchIndex<T> {
  readonly options: ClientSearchIndexOptions<T>
  private readonly docs = new Map<string, T>()
  private readonly mini: MiniSearch<T>
  private readonly extract: (doc: T, field: string) => string
  private readonly combineWith: 'AND' | 'OR'

  /**
   * Builds the index.
   *
   * @param docs - The documents.
   * @param options - How to index them.
   * @param config - Provider configuration.
   */
  constructor(docs: T[], options: ClientSearchIndexOptions<T>, config: MinisearchConfig) {
    this.options = options
    this.combineWith = config.combineWith ?? 'AND'
    const extract =
      options.extractField ?? ((doc: T, field: string) => extractFieldText(doc, field))
    this.extract = extract
    this.mini = new MiniSearch<T>({
      idField: options.idField,
      fields: options.fields,
      storeFields: [],
      extractField: (doc, field) =>
        field === options.idField ? String(doc[field]) : extract(doc, field),
    })
    for (const doc of docs) this.docs.set(String(doc[options.idField]), doc)
    this.mini.addAll(docs)
  }

  /** Number of documents in the index. */
  get size(): number {
    return this.docs.size
  }

  /**
   * Searches the index; a string goes through the core's query grammar first.
   *
   * @param query - Text, or a structured query.
   * @returns Matching documents, best first (insertion order in browse mode).
   */
  search(query: string | ClientSearchQuery): ClientSearchHit<T>[] {
    const q: ClientSearchQuery =
      typeof query === 'string'
        ? parseQuery(query, { filterFields: filterFieldsOf(this.options) })
        : query
    const filters = q.filters ?? []
    const phrases = q.phrases ?? []
    const exclude = q.exclude ?? []
    const text = q.text.trim()
    const passes = (doc: T): boolean =>
      matchesFilters(doc, filters) &&
      matchesText(doc, this.options.fields, phrases, exclude, this.extract as never)

    let hits: ClientSearchHit<T>[]
    if (!text) {
      // Browse mode: everything the constraints accept, in insertion order.
      hits = []
      for (const [id, doc] of this.docs) {
        if (passes(doc)) hits.push({ id, score: 0, doc, terms: [], fields: [] })
      }
    } else {
      // Only set what is defined: an explicit `undefined` would override
      // MiniSearch's own default for that option.
      const base: Record<string, unknown> = {
        prefix: this.options.prefix ?? true,
        filter: (r: { id: string }) => {
          const doc = this.docs.get(String(r.id))
          return !!doc && passes(doc)
        },
      }
      if (this.options.fuzzy !== false) base.fuzzy = this.options.fuzzy ?? 0.2
      if (this.options.boost) base.boost = this.options.boost
      let results = this.mini.search(text, { ...base, combineWith: this.combineWith })
      // A query MiniSearch tokenizes into several terms (spaces, or an unknown
      // `word:thing` kept as text) may match none of them together: rank the union.
      if (!results.length && this.combineWith === 'AND') {
        results = this.mini.search(text, { ...base, combineWith: 'OR' })
      }
      hits = results.map((r) => ({
        id: String(r.id),
        score: r.score,
        doc: this.docs.get(String(r.id)) as T,
        terms: r.terms,
        fields: Array.from(new Set(Object.values(r.match).flat())),
      }))
    }
    return q.limit != null ? hits.slice(0, q.limit) : hits
  }

  /**
   * Completions for a partial term.
   *
   * @param prefix - What has been typed so far.
   * @param limit - Maximum suggestions. Defaults to `5`.
   * @returns Suggested terms, most likely first.
   */
  suggest(prefix: string, limit = 5): string[] {
    if (!prefix.trim()) return []
    return this.mini
      .autoSuggest(prefix, {
        prefix: true,
        ...(this.options.fuzzy === false ? {} : { fuzzy: this.options.fuzzy ?? 0.2 }),
      })
      .slice(0, limit)
      .map((s) => s.suggestion)
  }

  /**
   * Adds a document.
   *
   * @param doc - The document; its id must not already be indexed.
   */
  add(doc: T): void {
    const id = String(doc[this.options.idField])
    if (this.docs.has(id))
      throw new Error(
        `@molecule/app-client-search-minisearch: id "${id}" is already indexed; use replace()`,
      )
    this.docs.set(id, doc)
    this.mini.add(doc)
  }

  /**
   * Replaces the document with the same id, or adds it.
   *
   * @param doc - The document.
   */
  replace(doc: T): void {
    const id = String(doc[this.options.idField])
    if (this.docs.has(id)) this.mini.discard(id)
    this.docs.set(id, doc)
    this.mini.add(doc)
  }

  /**
   * Removes a document by id; unknown ids are ignored.
   *
   * @param id - The document id.
   */
  remove(id: string): void {
    if (!this.docs.has(id)) return
    this.docs.delete(id)
    this.mini.discard(id)
  }
}

/**
 * Creates a MiniSearch client search provider.
 *
 * @param config - Provider configuration.
 * @returns A client search provider.
 */
export function createProvider(config: MinisearchConfig = {}): ClientSearchProvider {
  return {
    name: 'minisearch',
    createIndex<T extends ClientSearchDocument>(docs: T[], options: ClientSearchIndexOptions<T>) {
      return new MinisearchIndex<T>(docs, options, config)
    },
  }
}

/** Default MiniSearch provider instance. */
export const provider: ClientSearchProvider = createProvider()
