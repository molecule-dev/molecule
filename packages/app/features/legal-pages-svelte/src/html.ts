/**
 * HTML escaping for values interpolated into translations rendered as HTML.
 *
 * @module
 */

/**
 * HTML-escapes an interpolation value before it enters a translation whose
 * result is rendered as raw HTML (the `@html` block, the exact trust model React's
 * `dangerouslySetInnerHTML` uses). Svelte escapes text interpolations
 * automatically but NOT values interpolated into HTML strings — an `appName`
 * containing markup would otherwise execute inside the legal content.
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
