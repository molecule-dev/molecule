/**
 * `@molecule/api-git-provider-github` — a `@molecule/api-git-provider` bond.
 *
 * Register it with `registerGitProvider(provider)` in `setupBonds()`; the app
 * then never names this host. See the core package for the interface and for
 * why `basicAuthUsername` may be null.
 *
 * @example
 * ```typescript
 * import { registerGitProvider } from '@molecule/api-git-provider'
 * import { provider } from '@molecule/api-git-provider-github'
 *
 * registerGitProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
