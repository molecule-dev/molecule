/**
 * Registry for git hosting providers.
 *
 * A NAMED multi-provider category, like `ai`: a single deployment routinely has
 * several wired at once, because one user connects GitHub while another
 * connects GitLab. So this registers by id and looks up by id, rather than
 * holding a single current provider.
 *
 * @module
 */

import type { GitProvider } from './types.js'

const providers = new Map<string, GitProvider>()

/**
 * Register a git provider. Re-registering the same id replaces it.
 *
 * @param provider - The provider to register.
 */
export function registerGitProvider(provider: GitProvider): void {
  providers.set(provider.id, provider)
}

/**
 * Look up a registered provider.
 *
 * @param id - The provider id, e.g. `github`.
 * @returns The provider, or undefined when it is not wired.
 */
export function getGitProvider(id: string): GitProvider | undefined {
  return providers.get(id)
}

/**
 * Look up a provider, throwing when it is absent.
 *
 * Use this on a path where a missing provider is a configuration error rather
 * than a branch: the error names what IS wired, because "unknown provider
 * gitlab" is unactionable while "gitlab is not wired; github is" says exactly
 * what to do.
 *
 * @param id - The provider id.
 * @returns The provider.
 * @throws {Error} When no provider is registered under that id.
 */
export function requireGitProvider(id: string): GitProvider {
  const provider = providers.get(id)
  if (!provider) {
    const wired = [...providers.keys()].sort()
    throw new Error(
      `No git provider is wired for "${id}". ` +
        (wired.length
          ? `Wired: ${wired.join(', ')}.`
          : 'None are wired — call registerGitProvider() in setupBonds().'),
    )
  }
  return provider
}

/**
 * Every registered provider, sorted by id.
 *
 * This is what a UI should render as the list of connectable hosts — the set is
 * whatever the deployment wired, never a hardcoded union.
 *
 * @returns The registered providers.
 */
export function listGitProviders(): GitProvider[] {
  return [...providers.values()].sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * Whether a provider id is wired.
 *
 * @param id - The provider id.
 * @returns True when registered.
 */
export function hasGitProvider(id: string): boolean {
  return providers.has(id)
}

/**
 * Remove every registered provider. Test teardown only.
 */
export function clearGitProviders(): void {
  providers.clear()
}
