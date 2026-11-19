/**
 * Decoding of Solid Router's raw path params. Internal: not exported from the package entry.
 *
 * @module
 */

/**
 * Decodes one URL segment once, as React Router does for `useParams`, leaving it as
 * written when it is not valid percent-encoding.
 *
 * @param value - A parameter value as Solid Router matched it.
 * @returns The decoded text.
 */
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch (_error) {
    // Not valid percent-encoding: the text is already what the URL meant.
    return value
  }
}
