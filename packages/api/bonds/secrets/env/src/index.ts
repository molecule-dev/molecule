/**
 * Environment variables secrets provider for molecule.dev.
 *
 * Reads secrets from .env files and process.env.
 *
 * @example
 * ```typescript
 * import { get, getRequired, resolveAll, setProvider } from '@molecule/api-secrets'
 * import { createEnvProvider } from '@molecule/api-secrets-env'
 *
 * // Startup: bond once. Paths are relative to process.cwd(); later layers win, missing files are skipped.
 * setProvider(createEnvProvider({ layers: ['.env', '.env.local'] }))
 *
 * // Copy file values into process.env — a variable already set in the real environment is kept.
 * await resolveAll(['DATABASE_URL', 'SESSION_SECRET'])
 *
 * const databaseUrl = await getRequired('DATABASE_URL') // throws if missing/empty
 * const logLevel = (await get('LOG_LEVEL')) ?? 'info'
 * ```
 *
 * @remarks
 * - **Real environment variables beat the file** by default: `get()`/`getMany()`/`syncToEnv()`
 *   return `process.env[key]` when it is set and only fall back to the `.env` layers. Pass
 *   `override: true` to make the files win.
 * - **Files are read ONCE and cached for the process lifetime** — editing `.env` while the
 *   server runs changes nothing until restart. `syncToEnv()`/`resolveAll()` also only apply
 *   the first time (unless `override: true`).
 * - **A missing or unreadable layer file is silently skipped** (no error, no log) — a typo in
 *   a path looks exactly like "the key is not set". Check with `getRequired()` at boot.
 * - **The `autoLoad` option is accepted but currently has no effect** — nothing is loaded
 *   until the first `get()`/`getMany()`/`syncToEnv()` call.
 * - **`set()`/`delete()` rewrite the LAST layer file** (dropping its comments and
 *   re-serializing every merged key into it) and update `process.env`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
