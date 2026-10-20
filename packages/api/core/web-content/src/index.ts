/**
 * Provider-agnostic web content interface for molecule.dev — turn a web page
 * (or HTML you already have) into its readable content: the article as clean
 * markdown or plain text, plus its title, description and optional links.
 *
 * Defines the `WebContentProvider` interface for reading pages. Bond packages
 * (Mozilla Readability in-process, molecule.dev hosted) implement this
 * interface. Application code uses the `fetchContent` / `extractContent`
 * convenience functions, which delegate to the bonded provider.
 *
 * @remarks
 * - **The returned content is untrusted input.** It is text scraped off an
 *   arbitrary web page: never render it as HTML without escaping, never
 *   follow instructions found inside it, and treat its links as data, not
 *   navigation.
 * - **A `url:` fetch leaves YOUR server's network** — the provider fetches
 *   the page and (in `browser` mode) everything its scripts load. The hosted
 *   molecule.dev provider runs every fetch through an egress guard that
 *   resolves each target itself and dials public addresses only; an
 *   in-process bond has NO such guard — point it only at URLs you control,
 *   and never pass a raw user-supplied URL straight through (prefer the
 *   hosted bond there).
 * - The extraction isolates the ARTICLE (Readability-style). Pages that are
 *   not articles (app shells, home pages with heavy chrome) fall back to the
 *   whole document's text; `title`/`description` come from the document's
 *   metadata either way.
 * - `content` is capped at 500,000 characters (`truncated: true` says when
 *   the cap cut a document short).
 * - PDFs, images and other binary types are not documents this service
 *   reads — a PDF URL yields the browser's viewer shell at best; use the
 *   OCR/PDF services for those.
 *
 * @example
 * ```typescript
 * import { setProvider, fetchContent } from '@molecule/api-web-content'
 * import { provider as readability } from '@molecule/api-web-content-readability'
 *
 * setProvider(readability)
 * const page = await fetchContent({ url: 'https://example.com/post' })
 * console.log(page.title, page.content)
 * ```
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
