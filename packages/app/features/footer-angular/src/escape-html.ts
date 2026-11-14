/**
 * HTML escaping for values interpolated into translations rendered as HTML.
 *
 * @module
 */

/**
 * HTML-escapes an interpolation value before it enters a translation whose
 * result is rendered as raw HTML (React's `dangerouslySetInnerHTML`, here a
 * bypassed `[innerHTML]`). Angular escapes text interpolations automatically
 * but NOT values interpolated into HTML strings — an `appName` containing
 * markup would otherwise execute inside the legal content.
 *
 * @param value - The raw interpolation value.
 * @returns The escaped value, safe to interpolate into an HTML string.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
