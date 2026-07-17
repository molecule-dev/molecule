/**
 * Stepper provider wiring, backed by the shared `@molecule/app-bond` registry.
 *
 * Bond packages call `setProvider()` during setup; it delegates to
 * `bond('stepper', provider)`, so wiring via this package's `setProvider()` and
 * via `bond('stepper', …)` write the SAME registry slot — use either.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import { bond, get, isBonded, requireSingleton } from '@molecule/app-bond'

import type { StepperProvider } from './types.js'

const BOND_TYPE = 'stepper'

/**
 * Registers a stepper provider as the active singleton.
 *
 * @param provider - The stepper provider implementation to bond.
 */
export function setProvider(provider: StepperProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded stepper provider, or `null` if none is bonded.
 *
 * @returns The active stepper provider, or `null`.
 */
export function getProvider(): StepperProvider | null {
  return get<StepperProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a stepper provider has been bonded.
 *
 * @returns `true` if a stepper provider is available.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded stepper provider, throwing if none is configured.
 *
 * @returns The active stepper provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): StepperProvider {
  if (!isBonded(BOND_TYPE)) {
    throw new Error('Stepper provider not configured. Bond a stepper provider first.')
  }
  return requireSingleton<StepperProvider>(BOND_TYPE)
}
