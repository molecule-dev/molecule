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
 * - **Read-failure policy is configurable and NEVER silent.** On ANY Doppler read
 *   failure (missing/invalid token, network, non-2xx) the error is logged at `error`
 *   severity, then `fallbackToEnv` decides: `true` (**default**) returns the
 *   `process.env` value — resilient, but that value may be STALE or WRONG relative to
 *   Doppler; `false` RE-THROWS so callers get a hard failure instead of a possibly-wrong
 *   secret. Set via the `fallbackToEnv` option or the `DOPPLER_FALLBACK_TO_ENV` env var
 *   (`false`/`0`/`no`/`off` to disable). Either way a broken Doppler config is visible in
 *   the logs — call `provider.isAvailable()` at boot to confirm Doppler is actually used.
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
