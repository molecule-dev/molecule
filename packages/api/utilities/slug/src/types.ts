/**
 * Slug option types.
 *
 * @module
 */

/**
 * How {@link slugify} shapes a slug.
 */
export interface SlugifyOptions {
  /** Joins the words (default `'-'`). */
  separator?: string
  /** Longest slug kept, cut at a word boundary when one is near (default 80). */
  maxLength?: number
}

/**
 * How {@link uniqueSlug} looks for a free slug.
 */
export interface UniqueSlugOptions extends SlugifyOptions {
  /** Numbered tries (`slug-2` … `slug-N`) before a random suffix (default 20). */
  maxNumbered?: number
  /** Always end in a random suffix, even when the plain slug is free (default false). */
  alwaysSuffix?: boolean
  /** The base when the text has no letters or digits (default `'item'`). */
  fallback?: string
}
