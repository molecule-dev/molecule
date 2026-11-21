/**
 * Vue multi-step progress indicator.
 *
 * Exports:
 * - `<Stepper>` — steps with `dots` / `bar` / `cards` variants and horizontal / vertical orientations.
 * - `StepperStep`, `StepStatus` types.
 *
 * It is the Vue counterpart of `@molecule/app-stepper-react`: the same props
 * (React names), the same DOM for the same input, and the same
 * `onStepClick(stepId, index)` calls, so an app switches framework by changing
 * only the package name in its imports.
 *
 * Use for checkout flows, onboarding wizards, course module progress,
 * multi-page forms.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { Stepper } from '@molecule/app-stepper-vue'
 *
 * const steps = [
 *   { id: 'account', label: 'Account' },
 *   { id: 'plan', label: 'Choose plan' },
 *   { id: 'payment', label: 'Payment' },
 * ]
 *
 * const Checkout = defineComponent({
 *   setup() {
 *     const currentStep = ref(1)
 *     return () =>
 *       h(Stepper, {
 *         steps,
 *         currentStep: currentStep.value,
 *         variant: 'dots',
 *         onStepClick: (_id: string, index: number) => {
 *           currentStep.value = index
 *         },
 *       })
 *   },
 * })
 *
 * createApp(Checkout).mount('#app')
 * ```
 *
 * @remarks
 * - Purely visual and unrelated to `@molecule/app-stepper` (the headless
 *   step-STATE core with its own bond) — do NOT wire `bond('stepper')`
 *   for this component; you own `currentStep` in app state and this
 *   package only renders it.
 * - Requires a wired ClassMap bond (`getClassMap()` throws before
 *   bonding). Step labels are Vue children — pass translated strings.
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
export * from './types.js'
