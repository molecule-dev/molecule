/**
 * Configuration for the markdown-files content provider.
 *
 * @module
 */

/**
 * Provider configuration for {@link createProvider}. Everything has a
 * default; `createProvider()` with no argument is the common case.
 */
export interface MarkdownContentConfig {
  /**
   * File extensions read by `readDirectory`, lowercase with the dot.
   * Defaults to `['.md', '.markdown']`.
   */
  extensions?: string[]
  /** Whether `readDirectory` descends into subdirectories. Defaults to `true`. */
  recursive?: boolean
  /**
   * Where the slug comes from: `'frontMatter'` uses the front matter's `slug`
   * when present and falls back to the file name; `'filename'` always uses
   * the file name without its extension. Defaults to `'frontMatter'`.
   */
  slugFrom?: 'frontMatter' | 'filename'
  /** The front-matter field that marks a draft. Defaults to `'draft'`. */
  draftField?: string
  /** The front-matter field that holds the date. Defaults to `'date'`. */
  dateField?: string
}
