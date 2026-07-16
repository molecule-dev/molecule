/**
 * Doppler secrets provider for molecule.dev.
 *
 * Retrieves secrets from Doppler using their API, caching the full secret set
 * for a TTL (default 60 s; writes invalidate the cache).
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-secrets'
 * import { provider } from '@molecule/api-secrets-doppler'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * - **`DOPPLER_TOKEN` must be in the environment BEFORE this module is imported** —
 *   the default `provider` is created at import time and captures the token then. If
 *   the token arrives later (e.g. loaded from a `.env` file afterwards), wire
 *   `createDopplerProvider({ token })` yourself instead of using `provider`.
 * - **Falls back to `process.env` on ANY Doppler failure** (missing/invalid token,
 *   network, non-2xx) with only a logged warning — reads keep resolving from the
 *   environment, so a broken Doppler config degrades SILENTLY. Call
 *   `provider.isAvailable()` at boot to verify Doppler is actually being used.
 * - A SERVICE token scopes itself; a PERSONAL token additionally requires the
 *   `project` and `config` options on `createDopplerProvider()`.
 * - **`delete()` sets the secret to an empty string** — Doppler's API has no delete;
 *   remove secrets permanently in the Doppler dashboard.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
