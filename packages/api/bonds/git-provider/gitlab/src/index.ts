/**
 * `@molecule/api-git-provider-gitlab` — a `@molecule/api-git-provider` bond.
 *
 * Register it with `registerGitProvider(provider)` in `setupBonds()`; the app
 * then never names this host. See the core package for the interface and for
 * why `basicAuthUsername` may be null.
 *
 * @example
 * ```typescript
 * import { registerGitProvider, requireGitProvider } from '@molecule/api-git-provider'
 * import { provider as gitlab } from '@molecule/api-git-provider-gitlab'
 *
 * // Startup (setupBonds): register once. A deployment registers every host it supports.
 * registerGitProvider(gitlab)
 *
 * // Per request: the user's stored connection — from your DB, saved after the GitLab OAuth flow.
 * const connection = { providerId: 'gitlab', token: 'user-oauth-token' }
 *
 * const git = requireGitProvider(connection.providerId)
 * const repos = await git.listRepositories({
 *   host: git.defaultHost, // 'gitlab.com', or a self-hosted instance's hostname
 *   token: connection.token,
 *   page: 1, // 1-based
 *   perPage: 30,
 * }) // [{ fullName: 'gitlab-org/gitlab-runner', url: 'https://gitlab.com/gitlab-org/gitlab-runner.git', … }]
 *
 * const repo = await git.getRepository({
 *   host: git.defaultHost,
 *   token: connection.token,
 *   path: 'gitlab-org/gitlab-runner',
 * }) // null when it does not exist or the token cannot see it
 * console.log(repos.length, repo?.defaultBranch)
 * ```
 *
 * @remarks
 * - **Register it in the NAMED registry**: `registerGitProvider(provider)` from
 *   `@molecule/api-git-provider` — not `setProvider()` or `bond()`. Look it up per request with
 *   `requireGitProvider('gitlab')` (throws, naming what IS wired) or `getGitProvider('gitlab')`
 *   (`undefined`).
 * - **The GitLab application must grant `read_api` too** (the bond requests `read_api
 *   read_repository write_repository`): the `*_repository` scopes cover only the git protocol,
 *   so without `read_api` OAuth succeeds and then the repo listing 403s. This bond runs no
 *   OAuth exchange itself — `provider.auth` only describes the endpoints and scope.
 * - Requests go through `get()` from `@molecule/api-http` (its built-in fetch client unless
 *   another `http-client` is bonded). `getRepository()` returns `null` on 404; every other
 *   non-2xx THROWS the `HttpError`.
 * - Self-hosted GitLab: pass its bare hostname as `host` (API base `https://<host>/api/v4`,
 *   same shape as gitlab.com). `host` must be `hostname[:port]` — anything with a scheme, path
 *   or `user@` throws. The OAuth URLs in `provider.auth` point at gitlab.com; a self-hosted
 *   instance needs its own.
 * - For git over HTTPS the username is the literal `oauth2` (`basicAuthUsername`), NOT GitHub's
 *   `x-access-token`. `private` is `visibility !== 'public'` (so `internal` counts as private);
 *   `sizeKb` is converted from bytes.
 *
 * @module
 */

export * from './provider.js'
