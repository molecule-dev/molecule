/**
 * Stepper provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { StepperProvider } from './types.js'

let _provider: StepperProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: StepperProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): StepperProvider | null {
  return _provider
}

/**
 *
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 *
 */
export function requireProvider(): StepperProvider {
  if (!_provider) {
    throw new Error('Stepper provider not configured. Bond a stepper provider first.')
  }
  return _provider
}
