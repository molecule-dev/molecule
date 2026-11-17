/**
 * Root attributes shared by every OAuth provider logo's `<svg>`.
 *
 * @module
 */

/**
 * HTML's own marker for text that stays as written in every language: each
 * logo's accessible name is a brand name, so it takes no `t()` and no locale
 * bond, and localization tooling must leave it alone. React's `SVGProps`
 * typing does not model the HTML-global `translate` attribute, so it is
 * passed through as the plain attribute it is.
 */
export const untranslated = { translate: 'no' } as const
