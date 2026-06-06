/**
 * React multi-step progress indicator.
 *
 * Exports:
 * - `<Stepper>` — steps with `dots` / `bar` / `cards` variants and horizontal / vertical orientations.
 * - `StepperStep`, `StepStatus` types.
 *
 * Use for checkout flows, onboarding wizards, course module progress,
 * multi-page forms.
 *
 * @example
 * ```tsx
 * import { Stepper } from '@molecule/app-stepper-react'
 *
 * const steps = [
 *   { id: 'account', label: 'Account' },
 *   { id: 'plan', label: 'Choose plan' },
 *   { id: 'payment', label: 'Payment' },
 * ]
 *
 * <Stepper steps={steps} currentStep={1} variant="dots" />
 * ```
 *
 * @module
 */

export * from './Stepper.js'
