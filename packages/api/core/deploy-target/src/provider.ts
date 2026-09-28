/**
 * Deploy target bond accessors.
 *
 * Targets are bonded by NAME under the `deploy-target` category — an app
 * usually wires more than one (static files for a site, a machine for an app
 * with a server) and picks one per deploy. There is no singleton slot on
 * purpose: "the" deploy target is a per-app decision, and a default that
 * silently applied to every app is how a static site ends up on a machine it
 * does not need.
 *
 * @module
 */

import { bond, get as bondGet, getAll as bondGetAll, isBonded } from '@molecule/api-bond'

import type { DeployTargetProvider } from './types.js'

/** The bond category deploy targets are registered under. */
export const DEPLOY_TARGET_BOND_TYPE = 'deploy-target'

/**
 * Register a deploy target under a name.
 *
 * @param name - The slot to bond it in (`'static'`, `'machine'`, …).
 * @param provider - The target.
 */
export function setProvider(name: string, provider: DeployTargetProvider): void {
  bond(DEPLOY_TARGET_BOND_TYPE, name, provider)
}

/**
 * The target bonded under `name`, or `null`.
 *
 * @param name - The slot.
 * @returns The target, or `null` when nothing is bonded there.
 */
export function getProvider(name: string): DeployTargetProvider | null {
  return bondGet<DeployTargetProvider>(DEPLOY_TARGET_BOND_TYPE, name) ?? null
}

/**
 * Whether a target is bonded under `name`.
 *
 * @param name - The slot.
 * @returns `true` when one is.
 */
export function hasProvider(name: string): boolean {
  return isBonded(DEPLOY_TARGET_BOND_TYPE, name)
}

/**
 * The target bonded under `name`.
 *
 * @param name - The slot.
 * @returns The target.
 * @throws {Error} When nothing is bonded there — never falls back to another
 *   slot, because a deploy that lands somewhere other than where it was sent is
 *   worse than one that fails.
 */
export function requireProvider(name: string): DeployTargetProvider {
  const provider = getProvider(name)
  if (!provider) {
    throw new Error(
      `No deploy target is bonded as '${name}'. Bond one with setProvider('${name}', provider).`,
    )
  }
  return provider
}

/**
 * Every bonded target, by slot name.
 *
 * @returns A map of slot name → target (empty when none are bonded).
 */
export function listProviders(): Map<string, DeployTargetProvider> {
  return bondGetAll<DeployTargetProvider>(DEPLOY_TARGET_BOND_TYPE)
}
