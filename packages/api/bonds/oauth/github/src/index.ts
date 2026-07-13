/**
 * GitHub OAuth provider for molecule.dev.
 *
 * @remarks
 * - The token exchange (`verify`'s call to GitHub's token endpoint) is
 *   `application/x-www-form-urlencoded`, per RFC 6749 §4.1.3 — matching
 *   every other molecule.dev OAuth bond (google, gitlab, twitter, apple,
 *   microsoft). GitHub's endpoint also accepts JSON, but form-encoding is
 *   the spec-compliant, universally-supported choice.
 * - `verify` accepts a third `redirectUri` argument (falling back to
 *   `APP_ORIGIN`, same as the other bonds) and includes it in the token
 *   exchange. GitHub.com itself is lenient about a missing/mismatched
 *   `redirect_uri`, but a redirect_uri-enforcing GitHub Enterprise instance
 *   or strict proxy would otherwise reject the exchange with an error that
 *   looks unrelated to the missing parameter.
 *
 * @module
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
