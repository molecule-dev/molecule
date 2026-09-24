/**
 * Doppler secrets provider for molecule.dev.
 *
 * Retrieves secrets from Doppler using their API, caching the full secret set
 * for a TTL (default 60 s; writes invalidate the cache).
 *
 * @example
 * ```typescript
 * import { getRequired, resolveAll, setProvider } from '@molecule/api-secrets'
 * import { createDopplerProvider } from '@molecule/api-secrets-doppler'
 *
 * // Startup, BEFORE anything reads process.env: bond once. DOPPLER_TOKEN is a service token (dp.st.…).
 * setProvider(
 *   createDopplerProvider({
 *     token: process.env.DOPPLER_TOKEN,
 *     fallbackToEnv: false, // fail hard instead of serving a possibly-stale process.env value
 *   }),
 * )
 *
 * // Copy the secrets the app needs from Doppler into process.env (one API call, cached 60s).
 * await resolveAll(['DATABASE_URL', 'STRIPE_SECRET_KEY'])
 *
 * // Or read one directly — throws if it is missing/empty.
 * const stripeKey = await getRequired('STRIPE_SECRET_KEY')
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
 * - **`resolveAll()` / `syncToEnv()` never throw on a Doppler failure** — they log a
 *   warning and leave `process.env` untouched (regardless of `fallbackToEnv`), and a key
 *   Doppler does not have is simply not written. Follow with `getRequired()` (or the core's
 *   `validate()`) when a missing secret must stop the boot.
 * - **`delete()` sets the secret to an empty string** — Doppler's API has no delete;
 *   remove secrets permanently in the Doppler dashboard.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
