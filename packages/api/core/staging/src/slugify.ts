/**
 * Branch name to slug conversion utility.
 *
 * Converts git branch names into DNS-safe, filesystem-safe slugs
 * suitable for use in environment names, container names, and URLs.
 *
 * @module
 */

/**
 * Converts a git branch name to a DNS-safe, filesystem-safe slug.
 *
 * @example
 * ```typescript
 * branchToSlug('feature/user-login')    // 'feature-user-login'
 * branchToSlug('refs/heads/main')       // 'main'
 * branchToSlug('fix/CAPS-and_Under')    // 'fix-caps-and-under'
 * ```
 *
 * @param branch - The git branch name (e.g. `'feature/user-login'`).
 * @param maxLength - Maximum slug length (default: 40).
 * @returns A lowercase, hyphenated slug.
 */
export function branchToSlug(branch: string, maxLength: number = 40): string {
  return branch
    .toLowerCase()
    .replace(/^refs\/heads\//, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength)
    .replace(/-$/, '')
}
