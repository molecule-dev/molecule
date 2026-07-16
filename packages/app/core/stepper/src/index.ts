/**
 * Stepper core interface for molecule.dev.
 *
 * Provides a standardized API for multi-step wizard / stepper UI
 * components. Bond a provider (e.g. `@molecule/app-stepper-default`)
 * to supply the concrete implementation.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-stepper'
 * import { provider } from '@molecule/app-stepper-default'
 *
 * setProvider(provider) // once, at startup (bonds.ts)
 *
 * const stepper = requireProvider().createStepper({
 *   steps: [{ label: 'Account' }, { label: 'Profile' }, { label: 'Review' }],
 *   onStepChange: (step) => rerender(step),
 * })
 * stepper.next()
 * ```
 *
 * @remarks
 * - **The instance is HEADLESS state, not UI.** `createStepper` returns a step
 *   state machine — nothing appears on screen. The app renders the step
 *   indicator and content itself, re-rendering from `onStepChange` /
 *   `getActiveStep()`; style via `getClassMap()` from `@molecule/app-ui` and
 *   run every label through `t('key', values, { defaultValue })`.
 * - **Wire the bond at startup** — {@link requireProvider} throws until
 *   `setProvider` has been called.
 * - Call `destroy()` when the owning screen unmounts.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
