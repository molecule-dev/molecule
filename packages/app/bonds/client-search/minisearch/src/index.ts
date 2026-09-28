/**
 * MiniSearch bond for `@molecule/app-client-search`.
 *
 * In-memory full-text search over a list the app already holds: prefix
 * matching, typo tolerance, per-field boosts, and the core's shared query
 * grammar (`category:auth -deprecated "sign in"`). MiniSearch is a small
 * dependency-free library that indexes a few thousand records in
 * milliseconds and answers a keystroke well under a frame.
 *
 * @example
 * ```typescript
 * import { createIndex, setProvider } from '@molecule/app-client-search'
 * import { provider } from '@molecule/app-client-search-minisearch'
 *
 * setProvider(provider)
 *
 * const index = createIndex(templates, {
 *   idField: 'slug',
 *   fields: ['name', 'description', 'tags', 'packages'],
 *   filterFields: ['category', 'tags'],
 *   boost: { name: 3, tags: 2 },
 * })
 * index.search('tag:realtime chat')
 * ```
 *
 * @remarks
 * - **Free-text terms are ANDed first, then ORed as a fallback.** `stripe
 *   billing` prefers records mentioning both and still finds one mentioning
 *   either; pass `createProvider({ combineWith: 'OR' })` to rank the union
 *   from the start.
 * - **Hits carry the original document**, not a copy of stored fields, so a
 *   hit's `doc` is the same object you indexed (`===`). Do not mutate it and
 *   expect the index to notice — call `replace(doc)`.
 * - Filters (`field:value`), phrases and exclusions are evaluated by the core's
 *   shared helpers against the real document, so their meaning is identical
 *   across bonds; only ranking is MiniSearch's.
 * - The index is rebuilt from scratch by `createIndex`: for a list that
 *   changes a few records at a time, keep the index and `replace`/`remove`.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
