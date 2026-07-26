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

import { bond, expectBond, getAll, isBonded, require as bondRequire } from '@molecule/api-bond'

import type { ProjectArchiveProvider, ProjectExternalStateProvider } from './types.js'

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

// ---------------------------------------------------------------------------
// External-state providers (a NAMED, multi-provider category)
// ---------------------------------------------------------------------------
//
// Separate from the archive provider above, and named separately, because they
// answer different questions: `ProjectArchiveProvider` is "where does the
// artifact live?" (one answer per deployment) and
// `ProjectExternalStateProvider` is "what else does this project own?" (as many
// answers as it owns kinds of state). Both live in this package because a
// project archive that captures only the source tree is not an archive of the
// project — they are one feature, not two.

const EXTERNAL_STATE_BOND_TYPE = 'project-archive-external-state'
// Deliberately NOT `expectBond(EXTERNAL_STATE_BOND_TYPE)`, for two independent
// reasons — either alone is disqualifying:
//
// 1. It is UNSATISFIABLE. `setExternalStateProvider()` below registers NAMED
//    providers (`bond(type, kind, provider)` → `registry.named`), but
//    `validateBonds()` only inspects `registry.singletons`. An expectation on a
//    named-only category can never be met, so the server refuses to boot no
//    matter how many providers the app wires — with a message telling the
//    developer to wire the bonds they already wired. (`api-ai` gets away with
//    `expectBond` on a named category only because its `setProvider(name, p)`
//    auto-promotes the first named provider to the singleton. This one does not,
//    and should not: promoting one `kind` to "the" provider is meaningless here.)
// 2. Even if it were satisfiable, requiring it would be WRONG. An empty provider
//    map is legitimate (see `getExternalStateProviders()`) — a deployment whose
//    projects own nothing outside their source tree needs no providers, and must
//    still boot.
//
// Coverage of state-owning categories is enforced where it can actually be
// checked: `mlcl/scripts/check-external-state-coverage.mjs`
// (`npm run verify:external-state`), which knows which categories own
// unregenerable state. A boot-time bond assertion cannot know that.

/**
 * Register an external-state provider under its own
 * {@link ProjectExternalStateProvider.kind}.
 *
 * Registering under the provider's own `kind` rather than a caller-chosen name
 * is what makes restore routing work: records carry `kind`, and that is the key
 * they are looked up by. A provider bonded under a different name captures state
 * that nothing can restore.
 *
 * @param provider - The provider to register.
 */
export function setExternalStateProvider(provider: ProjectExternalStateProvider): void {
  bond(EXTERNAL_STATE_BOND_TYPE, provider.kind, provider)
}

/**
 * Every registered external-state provider, keyed by kind.
 *
 * An archive captures from ALL of them; a restore routes each record back to the
 * one whose kind matches. An empty map is legitimate — a deployment whose
 * projects own nothing outside their source tree needs no providers.
 *
 * @returns The registered providers, keyed by {@link ProjectExternalStateProvider.kind}.
 */
export function getExternalStateProviders(): Map<string, ProjectExternalStateProvider> {
  return getAll<ProjectExternalStateProvider>(EXTERNAL_STATE_BOND_TYPE)
}

/**
 * One registered external-state provider by kind, or null.
 *
 * A restore that finds null for a kind it HAS records for must fail loudly
 * rather than skip: the records exist because that state was captured, and
 * silently not restoring it hands the user a project missing its data.
 *
 * @param kind - The {@link ProjectExternalStateProvider.kind} to look up.
 * @returns The provider, or null.
 */
export function getExternalStateProvider(kind: string): ProjectExternalStateProvider | null {
  return getExternalStateProviders().get(kind) ?? null
}

/**
 * Whether any external-state provider is registered.
 *
 * @returns True when at least one provider is bonded.
 */
export function hasExternalStateProviders(): boolean {
  return getExternalStateProviders().size > 0
}
