/**
 * `@molecule/api-git-provider-smolforge` — a `@molecule/api-git-provider` bond.
 *
 * Register it with `registerGitProvider(provider)` in `setupBonds()`; the app
 * then never names this host. See the core package for the interface and for
 * why `basicAuthUsername` may be null.
 *
 * @example
 * ```typescript
 * import { registerGitProvider, requireGitProvider } from '@molecule/api-git-provider'
 * import { provider as smolforge } from '@molecule/api-git-provider-smolforge'
 *
 * // Startup (setupBonds): register once. A deployment registers every host it supports.
 * registerGitProvider(smolforge)
 *
 * // Per request: the user's stored connection — a personal access token the user pasted in.
 * const connection = { providerId: 'smolforge', token: 'user-access-token' }
 *
 * const git = requireGitProvider(connection.providerId)
 * const repos = await git.listRepositories({
 *   host: git.defaultHost, // 'forge.smol.ai', or a self-hosted instance's hostname
 *   token: connection.token,
 *   page: 1, // 1-based
 *   perPage: 30,
 * }) // [{ fullName: 'ada/notes', url: 'https://forge.smol.ai/ada/notes.git', sizeKb: null, … }]
 *
 * const repo = await git.getRepository({
 *   host: git.defaultHost,
 *   token: connection.token,
 *   path: 'ada/notes',
 * }) // null when it does not exist or the token cannot see it
 * console.log(repos.length, repo?.defaultBranch)
 * ```
 *
 * @remarks
 * - **Register it in the NAMED registry**: `registerGitProvider(provider)` from
 *   `@molecule/api-git-provider` — not `setProvider()` or `bond()`. Look it up per request with
 *   `requireGitProvider('smolforge')` (throws, naming what IS wired) or
 *   `getGitProvider('smolforge')` (`undefined`).
 * - **No OAuth.** `provider.auth.kind` is `'pat'`: there are no authorize/token URLs — link the
 *   user to `auth.tokensUrl`, have them paste a personal access token, and store it. Never
 *   start an OAuth redirect for this provider.
 * - **`basicAuthUsername` is `null` on purpose**: git over HTTPS needs the user's OWN SmolForge
 *   username (with the token as password). Store the username with the token; there is no
 *   literal to fall back on.
 * - Requests go through `get()` from `@molecule/api-http` (bearer token). `getRepository()`
 *   returns `null` on 404 and THROWS the `HttpError` for any other non-2xx. `host` must be a
 *   bare `hostname[:port]`; API base is `https://<host>/api`.
 * - `sizeKb` is always `null` (the API does not report size) and `url` is built as
 *   `https://<host>/<owner>/<name>.git`; `private` is `visibility !== 'public'`.
 *
 * @module
 */

export * from './provider.js'
