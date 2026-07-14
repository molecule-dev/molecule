/**
 * GitLab OAuth provider for molecule.dev.
 *
 * @remarks
 * The token exchange (`verify`'s call to GitLab's Doorkeeper token endpoint)
 * is `application/x-www-form-urlencoded`, per RFC 6749 §4.1.3 — matching
 * every other molecule.dev OAuth bond (google, twitter, github, apple,
 * microsoft).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
