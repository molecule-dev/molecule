/**
 * Stepper core interface for molecule.dev.
 *
 * Provides a standardized API for multi-step wizard / stepper UI
 * components. Bond a provider (e.g. `@molecule/app-stepper-default`)
 * to supply the concrete implementation.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { requireProvider } from '@molecule/app-stepper'
 *
 * const stepper = requireProvider().createStepper({
 *   steps: [
 *     { label: 'Account' },
 *     { label: 'Profile' },
 *     { label: 'Review' },
 *   ],
 * })
 * stepper.next()
 * ```
 */

export * from './provider.js'
export * from './types.js'
