/**
 * HTML helpers for the footer's app-name interpolation.
 *
 * Svelte escapes text children and `{expression}` text automatically but NOT
 * values interpolated into a raw-HTML string — the same gap React has
 * between text children and `dangerouslySetInnerHTML`. An `appName` containing
 * markup would otherwise execute inside the legal content, so it is escaped
 * before it enters a translation whose result is rendered as HTML.
 *
 * @module
 */

/**
 * HTML-escapes an interpolation value before it enters a translation whose
 * result is rendered as HTML (Svelte's raw-HTML block, React's
 * `dangerouslySetInnerHTML`). Both frameworks' footers escape with the same
 * entities, so the rendered legal HTML is byte-identical for the same input.
 *
 * @param value - The raw interpolation value.
 * @returns The value with `&`, `<`, `>`, `"` and `'` replaced by their entities.
 */
export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

/**
 * Whether an href points at an external site (an `http`/`https` URL) and is
 * therefore rendered as a plain `target="_blank"` anchor instead of an
 * in-app link.
 *
 * @param href - The About-link target.
 * @returns Whether the href starts with an `http`/`https` scheme.
 */
export const isExternalHref = (href: string): boolean => /^https?:\/\//i.test(href)
