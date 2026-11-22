/**
 * The markdown link scheme gate, shared by `MarkdownContent.svelte` and its
 * tests. Plain TypeScript (not a `<script module>` export) so plain tsc and
 * consumers can import it.
 *
 * @module
 */

/**
 * The only URL schemes that may become an `<a href>` anchor. Model output
 * is prompt-injectable (the agent reads imported repos, shared projects,
 * scraped content), and browsers percent-decode hrefs before executing them,
 * so a `[x](javascript:fetch%28…%29)` link must never reach the DOM as an
 * anchor — any other scheme renders as inert text (same policy as the
 * markdown bonds' `isSafeUrl`).
 */
const EXTERNAL_LINK_SCHEMES = new Set(['http:', 'https:', 'mailto:'])

/**
 * Whether `href` may become an `<a href>` anchor at all. A URL whose scheme
 * is NOT on the allowlist (`javascript:`, `data:`, `vbscript:`, …) must
 * render as inert text. A href with NO scheme (app routes, `#anchor`,
 * `//host`) carries nothing executable, so it is allowed through this gate.
 *
 * Browsers strip tab/CR/LF anywhere in a URL (and leading C0 controls/space)
 * BEFORE scheme parsing, so `java\tscript:…` executes as `javascript:`. This
 * gate strips those characters first and reads the scheme the way the
 * browser will.
 *
 * @param href - The raw href from model output.
 * @returns True when the href may render as an anchor.
 */
export function isAllowedLinkHref(href: string): boolean {
  const withoutBreaks = href.replace(/[\t\r\n]/g, '')
  // A URL parser skips LEADING C0 controls and spaces before the scheme: do the
  // same, so `"\u0000javascript:..."` cannot slip past the allowlist.
  let start = 0
  while (start < withoutBreaks.length && withoutBreaks.charCodeAt(start) <= 0x20) start += 1
  const cleaned = withoutBreaks.slice(start)
  const scheme = /^([a-z][a-z0-9+.-]*:)/i.exec(cleaned)?.[1]?.toLowerCase()
  return scheme == null || EXTERNAL_LINK_SCHEMES.has(scheme)
}
