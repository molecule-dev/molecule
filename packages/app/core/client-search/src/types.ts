/**
 * Client-side search types for molecule.dev.
 *
 * The contract every client-search bond implements: build an index over a list
 * the app already holds in memory, then search it. Nothing here touches a
 * network or a server; for server-side search over a database see
 * `@molecule/api-search`.
 *
 * @module
 */

/** Any record with string keys. Field values may be strings, numbers, booleans or arrays of those. */
export type ClientSearchDocument = Record<string, unknown>

/**
 * How an index is built.
 */
export interface ClientSearchIndexOptions<T extends ClientSearchDocument = ClientSearchDocument> {
  /** The field holding each document's unique id (stringified). */
  idField: string

  /** The fields full-text search reads. Array values are joined with spaces. */
  fields: string[]

  /**
   * Fields a query may filter on with `field:value` — see {@link parseQuery}.
   * Defaults to `fields`. A filter field need not be a searched field: a
   * `category` used only for filtering is a common case.
   */
  filterFields?: string[]

  /** Per-field weight multipliers, e.g. `{ name: 3, description: 1 }`. */
  boost?: Record<string, number>

  /** Match on term prefixes (`auth` finds `authentication`). Defaults to `true`. */
  prefix?: boolean

  /**
   * Typo tolerance as a fraction of the term length (`0.2` lets a 5-letter
   * term be off by one letter). `false` disables it. Defaults to `0.2`.
   */
  fuzzy?: number | false

  /**
   * Turns a field's value into searchable text. The default joins arrays with
   * spaces and stringifies everything else; `undefined`/`null` become `''`.
   */
  extractField?: (doc: T, field: string) => string
}

/** One `field:value` constraint. Values are OR'd; several filters are AND'd. */
export interface ClientSearchFilter {
  /** The field the constraint applies to. */
  field: string

  /** Accepted values, compared case-insensitively; a trailing `*` matches a prefix. */
  values: string[]

  /** Documents matching this filter are DROPPED instead of kept (`-field:value`). */
  negate?: boolean
}

/**
 * A query in its structured form. {@link parseQuery} produces one from the
 * text a person types; the app may also build one directly.
 */
export interface ClientSearchQuery {
  /** The free-text part, with filters, phrases and exclusions already removed. */
  text: string

  /** `"quoted phrases"` that must appear verbatim (case-insensitive) in a searched field. */
  phrases?: string[]

  /** `-terms` that must NOT appear (as a word prefix) in any searched field. */
  exclude?: string[]

  /** `field:value` constraints. */
  filters?: ClientSearchFilter[]

  /** Maximum hits to return. Defaults to the bond's choice (all matches). */
  limit?: number
}

/** What {@link parseQuery} returns: a query plus the text it came from. */
export interface ParsedQuery extends ClientSearchQuery {
  /** The original text, untouched. */
  raw: string

  phrases: string[]
  exclude: string[]
  filters: ClientSearchFilter[]
}

/**
 * One matching document.
 */
export interface ClientSearchHit<T extends ClientSearchDocument = ClientSearchDocument> {
  /** The document's id (its `idField` value, stringified). */
  id: string

  /** Relevance; higher is better. Browse-mode results (empty text) score `0`. */
  score: number

  /** The document as it was indexed. */
  doc: T

  /** The query terms that matched (after prefix/fuzzy expansion). */
  terms: string[]

  /** The fields the terms matched in. */
  fields: string[]
}

/**
 * An index over a set of documents. Built once, searched many times; documents
 * may be added, replaced or removed afterwards.
 */
export interface ClientSearchIndex<T extends ClientSearchDocument = ClientSearchDocument> {
  /** The options the index was built with. */
  readonly options: ClientSearchIndexOptions<T>

  /** Number of documents in the index. */
  readonly size: number

  /**
   * Searches the index.
   *
   * A string is parsed with {@link parseQuery} first (so `category:auth oauth`
   * works). A {@link ClientSearchQuery} is used as given. Empty text with
   * filters is browse mode: every document the filters accept, in insertion
   * order, scored `0`. Empty text and no filters returns every document.
   */
  search(query: string | ClientSearchQuery): ClientSearchHit<T>[]

  /** Completions for a partial term, most likely first. */
  suggest(prefix: string, limit?: number): string[]

  /** Adds a document. Adding an id that exists is an error; use `replace`. */
  add(doc: T): void

  /** Replaces the document with the same id, or adds it. */
  replace(doc: T): void

  /** Removes a document by id. Unknown ids are ignored. */
  remove(id: string): void
}

/**
 * Client search provider interface. All client-search bonds implement this.
 */
export interface ClientSearchProvider {
  /** Provider name identifier (e.g. `'minisearch'`). */
  readonly name: string

  /**
   * Builds an index over `docs`.
   *
   * @param docs - The documents to index.
   * @param options - How to index them.
   * @returns A searchable index.
   */
  createIndex<T extends ClientSearchDocument>(
    docs: T[],
    options: ClientSearchIndexOptions<T>,
  ): ClientSearchIndex<T>
}
