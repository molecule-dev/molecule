/**
 * `@molecule/api-project-archive-external-state-d1` — captures and restores a
 * project's **Cloudflare D1** databases so archiving a Workers project does not
 * silently drop its data.
 *
 * `@molecule/api-project-archive` destroys the original once `result.verified`
 * is true. State whose provider was never written is captured by nobody,
 * verifies clean, and is then permanently deleted — so every state-owning
 * provider bond needs one of these. This is D1's.
 *
 * Capture shells out to `wrangler d1 export`, for the same reason the Postgres
 * bond shells out to `pg_dump`: only the engine that owns the data can produce a
 * consistent snapshot with schema, indexes and constraints intact.
 *
 * @example
 * ```typescript
 * import { setExternalStateProvider } from '@molecule/api-project-archive'
 * import { createD1ExternalStateProvider } from '@molecule/api-project-archive-external-state-d1'
 *
 * setExternalStateProvider(
 *   createD1ExternalStateProvider({
 *     // A DECLARATION of what the project owns — never a lookup.
 *     databaseNames: (projectId) => [`mol_${projectId}`],
 *   }),
 * )
 * ```
 *
 * @remarks
 * - **`databaseNames` declares; it must never search.** Asking Cloudflare which
 *   databases a project has cannot distinguish "none" from "this token cannot
 *   see them", and the caller destroys the project on a successful capture. An
 *   empty array is the only way to say "owns nothing"; a listed name that does
 *   not exist is an error.
 * - **`remote` defaults to `true`, deliberately.** `wrangler d1 export` without
 *   `--remote` dumps the LOCAL miniflare database, which in production is empty.
 *   Defaulting to local would yield a clean, successful, zero-row capture — and
 *   then the caller would destroy the real database.
 * - **A zero-byte export is treated as a failure, not an empty database.**
 *   `d1 export` always emits at least schema statements, so zero bytes means the
 *   export did not happen (wrong name, wrong account, silent auth failure).
 * - **Credentials come from the environment, never argv.** `wrangler` reads
 *   `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`; a token in argv is visible
 *   in `ps` to every user on the host. `wranglerArgs` is for `--config` and
 *   similar, not secrets.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
