/**
 * Mozilla Readability web content provider for `@molecule/api-web-content`.
 *
 * Read a page (bounded fetch, no JavaScript execution) or HTML you already
 * have, in this process: the article as clean markdown (GFM) or plain text,
 * plus title, description and optional links. Swap it for the hosted
 * `@molecule/api-web-content-molecule` without changing code that calls the
 * core.
 *
 * @example
 * ```typescript
 * import { setProvider, fetchContent } from '@molecule/api-web-content'
 * import { provider as readability } from '@molecule/api-web-content-readability'
 *
 * setProvider(readability)
 * const page = await fetchContent({ url: 'https://example.com/post' })
 * ```
 *
 * @remarks
 * - **No egress guard.** A `url:` fetch runs from your machine and follows
 *   redirects wherever they point — never pass a raw user-supplied URL
 *   straight through; prefer the hosted bond there.
 * - **Page JavaScript never runs here** (the extraction DOM has no
 *   `runScripts`), so `mode: 'browser'` is refused — use the hosted provider
 *   for script-rendered pages.
 * - Not an article (app shells, dumps)? The whole document's text is the
 *   content, so the result is never empty.
 * - Bounds: a 3 MB response body, a 2,048-character URL, 2,000,000
 *   characters of `extract` HTML, 500,000 characters of content
 *   (`truncated: true` when cut), 200 links. A non-UTF-8 page is decoded per
 *   its declared charset by the HTML parser; the fallback text decode is
 *   UTF-8.
 * - Mozilla Readability is Apache-2.0, Turndown and jsdom MIT — checked for
 *   commercial use before this bond shipped.
 */
export * from './browser-guard.js'
export * from './extract.js'
export * from './provider.js'
export * from './types.js'
