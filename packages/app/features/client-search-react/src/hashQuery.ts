/**
 * The search as part of the address: `#q=user%20feedback`.
 *
 * The hash rather than `?q=`, so a search is a link a static page serves
 * as-is and the app restores at once, with nothing for a server to parse.
 *
 * @module
 */

/** What the address bar's hash says about the search. */
export interface HashQuery {
  /** The query, or `''`. */
  query: string

  /**
   * The hash was a plain anchor (`#auth`), read as `<legacyField>:auth`; the
   * caller may rewrite it to the `#q=` form.
   */
  legacy: boolean
}

/** Options for {@link readHashQuery}. */
export interface ReadHashQueryOptions {
  /**
   * A field to turn a plain anchor into a filter for: with `'category'`,
   * `#auth` reads as `category:auth`. Without it a plain anchor is not a query.
   */
  legacyField?: string
}

/**
 * Reads the search from a hash: `#q=…` is the query as typed (URL-encoded).
 *
 * @param hash - The hash, with or without `#`. Defaults to the address bar's.
 * @param options - How to treat a plain anchor.
 * @returns The query and whether it came from a plain anchor.
 */
export function readHashQuery(
  hash: string = typeof window === 'undefined' ? '' : window.location.hash,
  options: ReadHashQueryOptions = {},
): HashQuery {
  const raw = hash.replace(/^#/, '')
  if (!raw) return { query: '', legacy: false }
  if (raw.startsWith('q=')) {
    try {
      return { query: decodeURIComponent(raw.slice(2).replace(/\+/g, ' ')), legacy: false }
    } catch (_error) {
      // A malformed escape is not a query.
      return { query: '', legacy: false }
    }
  }
  if (raw.includes('=') || !options.legacyField) return { query: '', legacy: false }
  let anchor: string
  try {
    anchor = decodeURIComponent(raw).trim()
  } catch (_error) {
    // A malformed escape is not an anchor either.
    return { query: '', legacy: false }
  }
  return anchor
    ? { query: `${options.legacyField}:${anchor}`, legacy: true }
    : { query: '', legacy: false }
}

/**
 * The hash for a query.
 *
 * @param query - The text.
 * @returns `#q=…`, or `''` for blank text.
 */
export function hashForQuery(query: string): string {
  return query.trim() ? `#q=${encodeURIComponent(query)}` : ''
}

/**
 * Puts the query in the hash without scrolling. `replace` (the default)
 * rewrites the current history entry, for typing; `push` adds one, for a
 * committed search, so Back returns to the previous search.
 *
 * @param query - The text.
 * @param mode - `replace` or `push`.
 */
export function writeHashQuery(query: string, mode: 'replace' | 'push' = 'replace'): void {
  if (typeof window === 'undefined') return
  const hash = hashForQuery(query)
  const next = window.location.pathname + window.location.search + hash
  const current = window.location.pathname + window.location.search + window.location.hash
  if (next === current) return
  if (mode === 'push') window.history.pushState(window.history.state, '', next)
  else window.history.replaceState(window.history.state, '', next)
}
