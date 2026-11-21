/**
 * Angular multi-step progress indicator.
 *
 * Exports:
 * - `<Stepper>` — steps with `dots` / `bar` / `cards` variants and horizontal / vertical orientations.
 * - `StepperStep`, `StepStatus` types.
 *
 * It is the Angular counterpart of `@molecule/app-stepper-react`: the same
 * props (React names), the same DOM for the same input, and the same
 * `onStepClick(stepId, index)` calls, so an app switches framework by changing
 * only the package name in its imports.
 *
 * Use for checkout flows, onboarding wizards, course module progress,
 * multi-page forms.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { Stepper, type StepperStep } from '@molecule/app-stepper-angular'
 *
 * @Component({
 *   selector: 'app-checkout',
 *   standalone: true,
 *   imports: [Stepper],
 *   template: `
 *     <div
 *       mol-stepper
 *       [steps]="steps"
 *       [currentStep]="currentStep()"
 *       [onStepClick]="goTo"
 *       variant="dots"
 *     ></div>
 *   `,
 * })
 * export class Checkout {
 *   readonly steps: StepperStep[] = [
 *     { id: 'account', label: 'Account' },
 *     { id: 'plan', label: 'Choose plan' },
 *     { id: 'payment', label: 'Payment' },
 *   ]
 *   readonly currentStep = signal(1)
 *   readonly goTo = (_id: string, index: number): void => this.currentStep.set(index)
 * }
 * ```
 *
 * @remarks
 * - Purely visual and unrelated to `@molecule/app-stepper` (the headless
 *   step-STATE core with its own bond) — do NOT wire `bond('stepper')`
 *   for this component; you own `currentStep` in app state and this
 *   package only renders it.
 * - Requires a wired ClassMap bond (`getClassMap()` throws before
 *   bonding). Node-valued step labels arrive as templates — pass translated
 *   strings otherwise.
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

export * from './stepper.component.js'
export * from './types.js'
