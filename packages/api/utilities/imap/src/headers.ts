/**
 * Lightweight RFC 822 header parser — splits a raw header block into a
 * `Record<string, string | string[]>` keyed by lower-cased header name.
 *
 * Pure function, no external dependencies. Implements just enough to expose
 * a useful headers map on {@link import('./types.js').FullMessage} without
 * pulling in a full MIME parser.
 *
 * @module
 */

const HEADER_NAME_RE = /^([!-9;-~]+):[\t ]?(.*)$/

/**
 * Parse a raw RFC 822 header block (CRLF-separated) into a map of
 * lower-cased header names to their values. Folded lines (continuation
 * lines starting with whitespace) are unfolded. Headers that appear more
 * than once are aggregated into an array.
 *
 * @param raw - Raw header block as a string or `Uint8Array`. UTF-8 is
 *   assumed when a `Uint8Array` is supplied.
 * @returns Header map keyed by lower-cased name.
 */
export function parseHeaders(
  raw: Uint8Array | string | undefined,
): Record<string, string | string[]> {
  if (!raw) return {}
  const text =
    typeof raw === 'string' ? raw : new TextDecoder('utf-8', { fatal: false }).decode(raw)

  // Unfold continuation lines: "\r\n( |\t)" → " "
  const unfolded = text.replace(/\r?\n[\t ]+/g, ' ')
  const lines = unfolded.split(/\r?\n/)

  const out: Record<string, string | string[]> = {}
  for (const line of lines) {
    if (line === '') continue
    const match = HEADER_NAME_RE.exec(line)
    if (!match) continue
    const name = match[1].toLowerCase()
    const value = match[2]
    const existing = out[name]
    if (existing === undefined) {
      out[name] = value
    } else if (Array.isArray(existing)) {
      existing.push(value)
    } else {
      out[name] = [existing, value]
    }
  }
  return out
}
