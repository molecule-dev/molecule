/**
 * XML string builder utilities.
 *
 * Zero-dependency XML generation for sitemaps, RSS, and Atom feeds.
 *
 * @module
 */

/**
 * Escapes special XML characters in a string.
 *
 * @param str - The string to escape.
 * @returns The XML-safe string.
 */
export const escapeXml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/**
 * Wraps content in an XML element. If content is `undefined` or empty, returns empty string.
 *
 * @param tag - The element tag name.
 * @param content - The element text content.
 * @param attributes - Optional element attributes.
 * @returns The XML element string, or empty string if no content.
 */
export const xmlElement = (
  tag: string,
  content?: string,
  attributes?: Record<string, string>,
): string => {
  if (content === undefined || content === '') {
    return ''
  }

  const attrs = attributes
    ? ' ' +
      Object.entries(attributes)
        .map(([k, v]) => `${k}="${escapeXml(v)}"`)
        .join(' ')
    : ''

  return `<${tag}${attrs}>${escapeXml(content)}</${tag}>`
}

/**
 * Creates a self-closing XML element with attributes.
 *
 * @param tag - The element tag name.
 * @param attributes - Element attributes.
 * @returns The self-closing XML element string.
 */
export const xmlSelfClosing = (tag: string, attributes: Record<string, string>): string => {
  const attrs = Object.entries(attributes)
    .map(([k, v]) => `${k}="${escapeXml(v)}"`)
    .join(' ')
  return `<${tag} ${attrs}/>`
}

/**
 * Formats a Date or ISO string to an ISO 8601 date string (W3C format).
 *
 * @param date - A Date object or ISO 8601 string.
 * @returns An ISO 8601 date string.
 */
export const toISODate = (date: string | Date): string => {
  if (date instanceof Date) {
    return date.toISOString()
  }
  return date
}

/**
 * Formats a Date or ISO string to RFC 822 date string (for RSS).
 *
 * @param date - A Date object or ISO 8601 string.
 * @returns An RFC 822 date string.
 */
export const toRFC822 = (date: string | Date): string => {
  const d = date instanceof Date ? date : new Date(date)
  return d.toUTCString()
}

/**
 * Joins non-empty lines, optionally with indentation.
 *
 * @param lines - Array of XML line strings (empty strings are filtered out).
 * @param indent - Indentation string per level.
 * @param level - Current indentation level.
 * @returns Joined string.
 */
export const joinLines = (lines: string[], indent: string, level: number): string => {
  const prefix = indent.repeat(level)
  return lines
    .filter((line) => line !== '')
    .map((line) => `${prefix}${line}`)
    .join('\n')
}
