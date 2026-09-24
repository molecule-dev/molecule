/**
 * `@molecule/api-git-provider-github` — a `@molecule/api-git-provider` bond.
 *
 * Register it with `registerGitProvider(provider)` in `setupBonds()`; the app
 * then never names this host. See the core package for the interface and for
 * why `basicAuthUsername` may be null.
 *
 * @example
 * ```typescript
 * import { registerGitProvider, requireGitProvider } from '@molecule/api-git-provider'
 * import { provider as github } from '@molecule/api-git-provider-github'
 *
 * // Startup (setupBonds): register once. A deployment registers every host it supports.
 * registerGitProvider(github)
 *
 * // Per request: the user's stored connection — from your DB, saved after the GitHub OAuth flow.
 * const connection = { providerId: 'github', token: 'user-oauth-token' }
 *
 * const git = requireGitProvider(connection.providerId)
 * const repos = await git.listRepositories({
 *   host: git.defaultHost, // 'github.com', or a self-hosted instance's hostname
 *   token: connection.token,
 *   page: 1, // 1-based
 *   perPage: 30,
 * }) // [{ fullName: 'octocat/Hello-World', url: 'https://github.com/octocat/Hello-World.git', … }]
 *
 * const repo = await git.getRepository({
 *   host: git.defaultHost,
 *   token: connection.token,
 *   path: 'octocat/Hello-World',
 * }) // null when it does not exist or the token cannot see it
 * console.log(repos.length, repo?.defaultBranch)
 * ```
 *
 * @remarks
 * - **Register it in the NAMED registry**: `registerGitProvider(provider)` from
 *   `@molecule/api-git-provider` — not `setProvider()` or `bond()`. Look it up per request with
 *   `requireGitProvider('github')` (throws, naming what IS wired) or `getGitProvider('github')`
 *   (`undefined`).
 * - This bond runs no OAuth exchange and stores no tokens: `provider.auth` only describes
 *   GitHub's authorize/token URLs and the `repo` scope. Your app runs the flow, stores the
 *   user's token, and passes it on every call.
 * - Requests go through `get()` from `@molecule/api-http` (its built-in fetch client unless
 *   another `http-client` is bonded). `getRepository()` returns `null` on 404 (missing OR not
 *   visible to the token); every other non-2xx THROWS the `HttpError` — it is not folded into
 *   `null`.
 * - GitHub Enterprise Server: pass its bare hostname as `host` (API base becomes
 *   `https://<host>/api/v3`). `host` must be `hostname[:port]` — a scheme, path or `user@`
 *   prefix throws before any request.
 * - For git over HTTPS use `basicAuthUsername` (`x-access-token`) as the username and the token
 *   as the password. `sizeKb` is GitHub's `size` in KB; `updatedAt` is the last push.
 *
 * @module
 */

export * from './provider.js'
