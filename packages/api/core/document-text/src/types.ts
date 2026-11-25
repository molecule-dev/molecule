/**
 * Type definitions for the document text core interface.
 *
 * @module
 */

/** Options for `extract`. */
export interface DocumentTextOptions {
  /**
   * Stop the result at the first N pages (1–500). The document is still
   * parsed whole; this bounds what the RESULT carries. Pages past the bound
   * are reported in `pagesOmitted`, never silently dropped.
   */
  maxPages?: number

  /**
   * Carry the per-page texts in `pages` (default `true`). `false` returns
   * only the joined `text` and the counts — lighter for long documents.
   */
  includePages?: boolean
}

/** One page's extracted text. */
export interface DocumentTextPage {
  /** 1-based page number in the original document. */
  pageNumber: number
  /** The text pdf.js found on the page, in reading order, with line breaks. */
  text: string
}

/** The document's metadata, when the PDF declares it. */
export interface DocumentTextInfo {
  title?: string
  author?: string
  subject?: string
  creator?: string
  producer?: string
}

/**
 * The text of one PDF document.
 */
export interface DocumentTextResult {
  /**
   * Every processed page's text, joined with a blank line between pages.
   * Capped at 500,000 characters; `truncated` says when that cap cut it.
   */
  text: string

  /**
   * The per-page texts, in page order — first `maxPages` pages of the
   * document (or all of them), unless `includePages: false`.
   */
  pages: DocumentTextPage[]

  /** Total pages the document holds. */
  pageCount: number

  /** True when `text` hit the 500,000-character cap. */
  truncated: boolean

  /**
   * Pages parsed but left out of the result (the `maxPages` bound, or
   * `includePages: false`). `pages.length + pagesOmitted === pageCount`.
   */
  pagesOmitted: number

  /** The document's declared metadata, when present. */
  info?: DocumentTextInfo
}

/**
 * Document text provider interface.
 *
 * All document text providers must implement this interface. Bond packages
 * (pdf.js in-process, molecule.dev hosted) provide concrete implementations.
 */
export interface DocumentTextProvider {
  /**
   * Extracts the text of one PDF document — no network, the bytes are parsed
   * in place.
   *
   * @param input - The document bytes (and an optional password for an
   *   encrypted document).
   * @param options - Extract options (page bound, per-page texts).
   * @returns The extracted text.
   */
  extract(
    input: { data: Uint8Array; password?: string },
    options?: DocumentTextOptions,
  ): Promise<DocumentTextResult>
}
