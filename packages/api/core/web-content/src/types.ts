/**
 * Type definitions for the web content core interface.
 *
 * @module
 */

/** How the readable content is returned. */
export type WebContentFormat = 'markdown' | 'text'

/**
 * How a `fetch` gets the page.
 *
 * - `'raw'` — load the HTML with JavaScript DISABLED and extract from the
 *   served markup: fast, and what a reader wants for articles and docs.
 * - `'browser'` — load with JavaScript enabled (and wait `settleMs` after the
 *   load event), so single-page apps that render into an empty shell get
 *   their real DOM extracted.
 */
export type WebContentMode = 'raw' | 'browser'

/**
 * What to read — a URL to fetch, or HTML the caller already has. Exactly one
 * of the two must be given.
 */
export interface WebContentSource {
  /**
   * The page to read, `http:` or `https:`. A provider fetches what this page
   * names (redirects, subresources) with YOUR server's network access (SSRF)
   * — see the provider's own docs for whether an egress guard is in front of
   * it. The hosted molecule.dev provider dials public addresses only; an
   * in-process bond has no such guard.
   */
  url?: string

  /** The HTML to extract readable content from — a full document or a fragment. */
  html?: string

  /**
   * The base URL used to resolve the document's relative links (extract from
   * `html` only). Must be absolute http(s). Defaults to `about:blank`, which
   * makes relative links unresolvable (they are dropped from `links`).
   */
  baseUrl?: string
}

/** Options shared by `fetch` and `extract`. */
export interface WebContentOptions {
  /**
   * How a `fetch` gets the page (`'raw'` — no JavaScript, default — or
   * `'browser'` — JavaScript enabled). Ignored by `extract`.
   */
  mode?: WebContentMode

  /** Return `'markdown'` (default) or plain `'text'`. */
  format?: WebContentFormat

  /**
   * Collect the document's links (up to 200, deduped by URL, http(s) only)
   * into the result. Off by default — a big page carries a lot of navigation.
   */
  includeLinks?: boolean

  /**
   * Milliseconds to wait after a `'browser'` load before extracting (0–5000),
   * so client-side rendering can finish. Ignored for `'raw'` and `extract`.
   */
  settleMs?: number
}

/** One collected link. */
export interface WebContentLink {
  /** The absolute URL (`http:`/`https:` only; relative links resolved against the document). */
  url: string
  /** The anchor text, trimmed, at most 200 characters. */
  text: string
}

/**
 * The readable form of one document.
 */
export interface WebContentResult {
  /** The requested `url` (fetch), or the `baseUrl` when one was given (extract). */
  url?: string

  /** The URL after redirects (fetch only). */
  finalUrl?: string

  /** The HTTP status of the final response (fetch only; extract never fetches). */
  statusCode?: number

  /** The final response's `content-type` (fetch only). */
  contentType?: string

  /** The document title (or the article title the extraction found). */
  title?: string

  /** The `meta[name=description]` / `og:description` value, when present. */
  description?: string

  /**
   * The readable content — the article in `format` (`markdown`/`text`), or
   * the whole document's text when the extraction could not isolate an
   * article. Capped at 500,000 characters; `truncated` says when that cap
   * cut it.
   */
  content: string

  /** Which format `content` is in. */
  format: WebContentFormat

  /** The document's links, when `includeLinks` was set (http(s), deduped, ≤ 200). */
  links?: WebContentLink[]

  /** True when `content` hit the 500,000-character cap. */
  truncated: boolean

  /** Size of the source the content was extracted from, in bytes. */
  bytes: number
}

/**
 * Web content provider interface.
 *
 * All web content providers must implement this interface. Bond packages
 * (readability in-process, molecule.dev hosted, …) provide concrete
 * implementations.
 */
export interface WebContentProvider {
  /**
   * Fetches a page and returns its readable content.
   *
   * @param source - What to read (`url` required; `html` must be absent).
   * @param options - Read options (mode, format, links, settle).
   * @returns The readable content.
   */
  fetch(
    source: { url: string } & Partial<WebContentSource>,
    options?: WebContentOptions,
  ): Promise<WebContentResult>

  /**
   * Extracts readable content from HTML the caller already has — no network.
   *
   * @param source - What to read (`html` required; `url` must be absent).
   * @param options - Extract options (format, links; `baseUrl` rides the source).
   * @returns The readable content.
   */
  extract(
    source: { html: string; baseUrl?: string } & Partial<WebContentSource>,
    options?: WebContentOptions,
  ): Promise<WebContentResult>
}
