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
 * import { useState } from 'react'
 *
 * import { Stepper, type StepperStep } from '@molecule/app-stepper-react'
 *
 * export function CheckoutProgress() {
 *   const steps: StepperStep[] = [
 *     { id: 'cart', label: 'Cart' },
 *     { id: 'shipping', label: 'Shipping', description: 'Address and delivery speed' },
 *     { id: 'payment', label: 'Payment' },
 *     { id: 'review', label: 'Review' },
 *   ]
 *   const [currentStep, setCurrentStep] = useState(2)
 *   return (
 *     <Stepper
 *       steps={steps}
 *       currentStep={currentStep}
 *       variant="cards"
 *       onStepClick={(_stepId, index) => setCurrentStep(index)}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Purely visual and unrelated to `@molecule/app-stepper` (the headless
 *   step-STATE core with its own bond) — do NOT wire `bond('stepper')`
 *   for this component; you own `currentStep` in app state and this
 *   package only renders it.
 * - `currentStep` is a 0-based INDEX (not a step id), and the prop is
 *   `currentStep` — not `activeStep`/`current`. Keep it in your own state
 *   and update it from `onStepClick` / your Next button.
 * - Requires a wired ClassMap bond (`getClassMap()` throws before
 *   bonding). Step labels are ReactNode — pass translated strings.
 * - Status is derived from `currentStep` unless a step sets an explicit
 *   `status`. The `'error'` member of `StepStatus` currently renders
 *   IDENTICALLY to `'pending'` (no error styling is implemented).
 * - `onStepClick` behavior differs by variant: in `cards` only completed
 *   steps are clickable (others are disabled); in `dots` the handler
 *   fires for ANY step — guard inside your handler if backward-only
 *   navigation is required. The `bar` variant is not clickable.
 * - Dots show state via checkmark/number and label weight only — there
 *   is no color fill per status.
 *
 * @module
 */

export * from './Stepper.js'
