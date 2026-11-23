/**
 * The one URL rule every markdown provider uses, so a link or image a user can
 * follow does not depend on which renderer produced the HTML.
 *
 * @module
 */

/** Schemes a rendered link or image may use, without the trailing colon. */
const SAFE_SCHEMES: ReadonlySet<string> = new Set([
  'http',
  'https',
  'mailto',
  'tel',
  'irc',
  'ircs',
  'xmpp',
])

/** Schemes no provider emits, whatever `sanitize` says. */
const SCRIPT_SCHEMES: ReadonlySet<string> = new Set(['javascript', 'vbscript'])

/**
 * Reports whether a character is whitespace or a control character that a URL
 * parser ignores inside a scheme (the `java\tscript:` bypass).
 *
 * @param char - One character from the URL.
 * @returns `true` when the character must be stripped before matching a scheme.
 */
function isIgnorableInScheme(char: string): boolean {
  if (/\s/.test(char)) return true
  const code = char.codePointAt(0) ?? 0
  return code <= 0x1f || code === 0x7f || (code >= 0x80 && code <= 0x9f)
}

/**
 * Decides whether a markdown link or image URL is safe to emit.
 *
 * Accepts `http:`, `https:`, `mailto:`, `tel:`, `irc:`, `ircs:` and `xmpp:`
 * URLs (scheme case-insensitive), relative URLs (`a/b`, `../a`, `?q=1`) and
 * fragments (`#x`). Every other scheme — `javascript:`, `vbscript:`, `data:`,
 * `file:` and unknown ones — is refused, including obfuscated forms a browser
 * still runs: whitespace and control characters inside the scheme, and mixed
 * case. Percent-encoded or entity-encoded text is not decoded, so `%6Aavascript:`
 * stays a relative path.
 *
 * @param url - The URL exactly as it appears in the markdown link or image.
 * @returns `true` when the URL may be emitted as-is, `false` when it must not.
 */
export function isSafeMarkdownUrl(url: string): boolean {
  const scheme = schemeOf(url)
  return scheme === undefined || SAFE_SCHEMES.has(scheme)
}

/**
 * Decides whether a markdown link or image renders as its text (or alt text)
 * instead of an element: what every provider asks of each `href` and `src`.
 *
 * With `sanitize` on (the default) that is every URL {@link isSafeMarkdownUrl}
 * refuses. With `sanitize` off every URL is kept except a `javascript:` or
 * `vbscript:` one, matched the same way (whitespace and control characters
 * stripped, case-insensitive), which no provider emits for any option.
 *
 * @param url - The URL exactly as it appears in the markdown link or image.
 * @param sanitize - The render's `sanitize` option; `true` when unset.
 * @returns `true` when the URL must not be emitted.
 */
export function isRefusedMarkdownUrl(url: string, sanitize = true): boolean {
  if (sanitize) return !isSafeMarkdownUrl(url)
  const scheme = schemeOf(url)
  return scheme !== undefined && SCRIPT_SCHEMES.has(scheme)
}

/**
 * Reads a URL's scheme the way a browser does: whitespace and control
 * characters inside it ignored, lowercased.
 *
 * @param url - The URL as written.
 * @returns The scheme without its colon, or `undefined` for a relative URL or a fragment.
 */
function schemeOf(url: string): string | undefined {
  const cleaned = Array.from(url)
    .filter((char) => !isIgnorableInScheme(char))
    .join('')
  return /^([a-z][a-z0-9+.-]*):/i.exec(cleaned)?.[1].toLowerCase()
}
