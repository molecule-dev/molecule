/**
 * Stepper provider singleton.
 *
 * Bond packages call `setProvider()` during setup.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import type { StepperProvider } from './types.js'

let _provider: StepperProvider | null = null

/**
 * Registers a stepper provider as the active singleton.
 *
 * @param provider - The stepper provider implementation to bond.
 */
export function setProvider(provider: StepperProvider): void {
  _provider = provider
}

/**
 * Retrieves the bonded stepper provider, or `null` if none is bonded.
 *
 * @returns The active stepper provider, or `null`.
 */
export function getProvider(): StepperProvider | null {
  return _provider
}

/**
 * Checks whether a stepper provider has been bonded.
 *
 * @returns `true` if a stepper provider is available.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Retrieves the bonded stepper provider, throwing if none is configured.
 *
 * @returns The active stepper provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): StepperProvider {
  if (!_provider) {
    throw new Error('Stepper provider not configured. Bond a stepper provider first.')
  }
  return _provider
}
