/**
 * Configuration for the pdf.js document text provider.
 *
 * @module
 */

/** Options for `createProvider()`. Every field has a documented default. */
export interface PdfjsDocumentTextConfig {
  /**
   * Characters the joined `text` may hold before it is cut (`truncated: true`).
   * Defaults to 500,000 — the cap the hosted molecule.dev service mirrors.
   */
  maxTextChars?: number

  /**
   * The default page bound when a call passes no `options.maxPages`.
   * Defaults to 500 — the bound the hosted molecule.dev service mirrors.
   */
  maxPages?: number
}
