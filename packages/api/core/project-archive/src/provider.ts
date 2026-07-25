/**
 * ProjectArchive provider bond accessor.
 *
 * Bond packages call `setProvider()` during setup, which registers the provider
 * in the shared `@molecule/api-bond` registry under the `'project-archive'` bond
 * type. Application code calls `getProvider()`/`requireProvider()` at runtime.
 * Because wiring routes through the shared registry, a generic
 * `bond('project-archive', provider)` call is equivalent to `setProvider()` and
 * `validateBonds()` can detect a missing provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type { ProjectArchiveProvider } from './types.js'

const BOND_TYPE = 'project-archive'
expectBond(BOND_TYPE)

/**
 * Set the active project archive provider.
 *
 * @param provider - The project archive provider to register.
 */
export function setProvider(provider: ProjectArchiveProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the active project archive provider, or null if none is configured.
 *
 * @returns The current provider or null.
 */
export function getProvider(): ProjectArchiveProvider | null {
  return isBonded(BOND_TYPE) ? bondRequire<ProjectArchiveProvider>(BOND_TYPE) : null
}

/**
 * Check whether a project archive provider is configured.
 *
 * @returns True if a provider has been set.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Get the active project archive provider, throwing if none is configured.
 *
 * @returns The current provider.
 * @throws {Error} if no provider has been set.
 */
export function requireProvider(): ProjectArchiveProvider {
  try {
    return bondRequire<ProjectArchiveProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      'ProjectArchive provider not configured. Bond a project-archive provider first.',
      { cause: error },
    )
  }
}
