/**
 * Molecule managed-vault secrets provider for molecule.dev.
 *
 * Fetches a single app's secrets from molecule.dev's managed, per-app encrypted
 * vault at runtime, caches them with a TTL, serves stale cache on transient
 * failure, and only then falls back to `process.env`. The bootstrap token + app
 * id are the only secrets that live in the environment. It is also the seam
 * through which credential brokering is delivered with no app-code change.
 *
 * @example
 * ```typescript
 * import { getRequired, resolveAll, setProvider } from '@molecule/api-secrets'
 * import { createMoleculeSecretsProvider } from '@molecule/api-secrets-molecule'
 *
 * // Startup, BEFORE anything reads process.env: bond once. MOLECULE_VAULT_TOKEN and
 * // MOLECULE_APP_ID are platform-provisioned in molecule.dev deployments.
 * setProvider(
 *   createMoleculeSecretsProvider({
 *     token: process.env.MOLECULE_VAULT_TOKEN,
 *     appId: process.env.MOLECULE_APP_ID,
 *   }),
 * )
 *
 * // Copy the app's secrets from the vault into process.env (one request, cached 60s per key).
 * await resolveAll(['DATABASE_URL', 'STRIPE_SECRET_KEY'])
 *
 * const stripeKey = await getRequired('STRIPE_SECRET_KEY') // throws if missing/empty
 * ```
 *
 * @remarks
 * - **`MOLECULE_VAULT_TOKEN` / `MOLECULE_APP_ID` must be in the environment BEFORE
 *   this module is imported** — the default `provider` captures them at import time
 *   (they are platform-provisioned in molecule.dev deployments, so this normally
 *   holds). For late-arriving credentials, wire
 *   `createMoleculeSecretsProvider({ token, appId })` instead.
 * - **Bond it with `setProvider()` from `@molecule/api-secrets`** (equivalent to
 *   `bond('secrets', provider)`), not under a `secrets-molecule` name.
 * - **`resolveAll()` / `syncToEnv()` never throw on a vault failure** — they log a warning and
 *   leave `process.env` untouched; a key the vault does not have is not written. Use
 *   `getRequired()` when a missing secret must stop the boot.
 * - Without a reachable vault AND no cached values, reads fall back to `process.env`
 *   with a logged warning — `provider.isAvailable()` at boot tells you which path
 *   you're on.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
