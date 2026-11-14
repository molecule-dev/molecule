/**
 * Footer helpers shared by the {@link AppFooter} component.
 *
 * @module
 */

/**
 * HTML-escapes an interpolation value before it enters a translation whose
 * result is rendered as HTML (`innerHTML`, the exact trust model React's
 * reference renders with through `dangerouslySetInnerHTML`). The DOM escapes
 * text children automatically but NOT values interpolated into HTML strings —
 * an `appName` containing markup would otherwise execute inside the legal
 * content.
 *
 * @param value - The raw interpolation value.
 * @returns The value with markup turned into inert entities.
 */
export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

/**
 * Whether an About href points off-app (a `http`/`https` URL) and must
 * therefore render as a plain `target="_blank"` anchor instead of an in-app
 * router link.
 *
 * @param href - The About href.
 * @returns True for `http`/`https` URLs (case-insensitive).
 */
export const isExternalHref = (href: string): boolean => /^https?:\/\//i.test(href)
