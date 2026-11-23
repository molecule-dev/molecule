/**
 * This bond's `urlTransform`, on the shared `isRefusedMarkdownUrl` rule in
 * `@molecule/app-markdown`, so a URL renders the same whichever markdown
 * provider produced the document.
 *
 * @module
 */

import type { UrlTransform } from 'react-markdown'

import { isRefusedMarkdownUrl } from '@molecule/app-markdown'

/**
 * Builds the `urlTransform` react-markdown applies to every `href`/`src` after
 * the rehype steps have already replaced a refused markdown link or image with
 * its text, so a URL that survives to this point still cannot slip through.
 *
 * With `sanitize: false` this is the identity: the rehype step already removed
 * every markdown link or image with a refused URL, so the only remaining
 * element with such a URL is raw HTML, which `sanitize: false` passes through
 * untouched as the app's own trusted markup (as the marked provider does).
 *
 * @param sanitize - The render's `sanitize` option.
 * @returns A react-markdown URL transform.
 */
export function createUrlTransform(sanitize: boolean): UrlTransform {
  if (!sanitize) {
    return (url: string): string => url
  }
  return (url: string): string => (isRefusedMarkdownUrl(url, sanitize) ? '' : url)
}
