/**
 * `@molecule/api-git-provider` — the abstract interface for a **git hosting
 * provider**: OAuth endpoints, the token auth shape a push expects, and
 * repository listing/lookup.
 *
 * This exists because "which git hosts do we support?" kept being answered by a
 * closed union inside the application:
 *
 * ```ts
 * const GIT_PROVIDERS = ['github', 'gitlab'] as const
 * const PROVIDER_DEFAULTS: Record<GitProvider, …>      // OAuth URLs + scopes
 * const TOKEN_USERNAME:    Record<string, string>      // x-access-token | oauth2
 * const DEFAULT_PROVIDER_HOSTS: Record<GitProvider, …> // github.com | gitlab.com
 * provider === 'github' ? `${base}/repos/${path}` : `${base}/projects/${…}`
 * ```
 *
 * Four parallel tables and a scatter of ternaries, all keyed off that union, so
 * adding a host meant editing the app. Behind this interface the supported set
 * becomes *whichever bonds are wired*, and a consumer never names a vendor.
 *
 * @example
 * ```typescript
 * import {
 *   listGitProviders,
 *   registerGitProvider,
 *   requireGitProvider,
 * } from '@molecule/api-git-provider'
 * import { provider as github } from '@molecule/api-git-provider-github'
 * import { provider as gitea } from '@molecule/api-git-provider-gitea'
 *
 * registerGitProvider(github)
 * registerGitProvider(gitea)
 *
 * // What a "connect your repo" picker offers — not a hardcoded list.
 * listGitProviders().map((p) => ({ id: p.id, label: p.label }))
 *
 * const p = requireGitProvider('github')
 * const repos = await p.listRepositories({
 *   host: p.defaultHost,
 *   token: '<oauth token>',
 *   page: 1,
 *   perPage: 30,
 * })
 * ```
 *
 * @remarks
 * - **Named multi-provider, like `ai` — not a singleton.** One deployment has
 *   several wired at once because different users connect different hosts.
 *   Register by id and look up by id; there is no "current" git provider.
 * - **`defaultHost` is a security boundary, not a default.** An OAuth token here
 *   grants repository read/write, so it must never be embedded in a remote URL
 *   for an arbitrary user-supplied host. Bind tokens to `defaultHost` plus any
 *   configured self-hosted endpoint, and refuse the rest.
 * - **`tokenUsername` is not cosmetic.** Pushing over HTTPS with a token as the
 *   password needs the username the provider expects (`x-access-token` for
 *   GitHub, `oauth2` for GitLab). The wrong one fails as an opaque auth error at
 *   push time, nowhere near the OAuth code that chose it.
 * - **`apiBaseForHost` takes the host** because the same provider serves a
 *   different base for its public host than for a self-hosted instance
 *   (`api.github.com` vs `<host>/api/v3`). A constant cannot express that.
 * - **`listRepositories` returns `[]` past the last page**, never an error — a
 *   caller paginating until empty is the normal shape, and a throw there turns
 *   an ordinary end-of-list into a failed import.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
