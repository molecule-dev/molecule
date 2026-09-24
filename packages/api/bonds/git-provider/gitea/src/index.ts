/**
 * `@molecule/api-git-provider-gitea` — a `@molecule/api-git-provider` bond.
 *
 * Register it with `registerGitProvider(provider)` in `setupBonds()`; the app
 * then never names this host. See the core package for the interface and for
 * why `basicAuthUsername` may be null.
 *
 * @example
 * ```typescript
 * import { registerGitProvider, requireGitProvider } from '@molecule/api-git-provider'
 * import { provider as gitea } from '@molecule/api-git-provider-gitea'
 *
 * // Startup (setupBonds): register once. A deployment registers every host it supports.
 * registerGitProvider(gitea)
 *
 * // Per request: the user's stored connection — from your DB, saved after the Gitea OAuth flow.
 * const connection = { providerId: 'gitea', token: 'user-oauth-token' }
 *
 * const git = requireGitProvider(connection.providerId)
 * const repos = await git.listRepositories({
 *   host: git.defaultHost, // 'gitea.com', or a self-hosted instance's hostname
 *   token: connection.token,
 *   page: 1, // 1-based
 *   perPage: 30,
 * }) // [{ fullName: 'gitea/tea', url: 'https://gitea.com/gitea/tea.git', … }]
 *
 * const repo = await git.getRepository({
 *   host: git.defaultHost,
 *   token: connection.token,
 *   path: 'gitea/tea',
 * }) // null when it does not exist or the token cannot see it
 * console.log(repos.length, repo?.defaultBranch)
 * ```
 *
 * @remarks
 * - **Register it in the NAMED registry**: `registerGitProvider(provider)` from
 *   `@molecule/api-git-provider` — not `setProvider()` or `bond()`. Look it up per request with
 *   `requireGitProvider('gitea')` (throws, naming what IS wired) or `getGitProvider('gitea')`
 *   (`undefined`).
 * - This bond runs no OAuth exchange and stores no tokens: `provider.auth` only describes
 *   gitea.com's authorize/token URLs and the `write:repository` scope. A self-hosted
 *   Gitea/Forgejo serves the same paths on its own host — build those URLs from your instance,
 *   not from `provider.auth`.
 * - Self-hosted instances: pass the bare hostname as `host` (API base `https://<host>/api/v1`).
 *   `host` must be `hostname[:port]` — a scheme, path or `user@` prefix throws before any
 *   request.
 * - The API token is sent as `Authorization: token <token>` (Gitea's scheme, not `Bearer`).
 *   Requests go through `get()` from `@molecule/api-http`; `getRepository()` returns `null` on
 *   404 and THROWS the `HttpError` for any other non-2xx.
 * - For git over HTTPS use `basicAuthUsername` (`x-access-token`) with the token as the
 *   password. `sizeKb` is Gitea's `size` in KB.
 *
 * @module
 */

export * from './provider.js'
