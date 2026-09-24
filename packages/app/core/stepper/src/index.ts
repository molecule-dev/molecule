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
 * import type { Step } from '@molecule/app-stepper'
 * import { provider } from '@molecule/app-stepper-default'
 *
 * setProvider(provider) // once, at startup (bonds.ts) — requireProvider() throws until then
 *
 * const account: Step = { label: 'Account' }
 * const profile: Step = { label: 'Profile', optional: true }
 * const review: Step = { label: 'Review' }
 *
 * let activeStep = 0
 * const stepper = requireProvider().createStepper({
 *   steps: [account, profile, review],
 *   linear: true, // can't move past an incomplete, non-optional step
 *   onStepChange: (step) => {
 *     activeStep = step // re-render the indicator + step content from here
 *   },
 * })
 *
 * stepper.next() // no-op: 'Account' is not completed yet
 * account.completed = true // after the step's form validates — the stepper reads these same objects
 * stepper.next() // → 1 'Profile'
 * stepper.next() // → 2 'Review' (optional steps may be skipped)
 * review.completed = true
 * console.log(activeStep, stepper.isComplete()) // 2 true
 *
 * stepper.destroy() // on unmount
 * ```
 *
 * @remarks
 * - **The instance is HEADLESS state, not UI.** `createStepper` returns a step
 *   state machine — nothing appears on screen. The app renders the step
 *   indicator and content itself, re-rendering from `onStepChange` /
 *   `getActiveStep()`; style via `getClassMap()` from `@molecule/app-ui` and
 *   run every label through `t('key', values, { defaultValue })`.
 * - **Wire it with THIS package's `setProvider()` or `bond('stepper', …)`.**
 *   `setProvider()` delegates into the shared `@molecule/app-bond` registry, so
 *   both write the same slot; {@link requireProvider} throws until one has run.
 * - **There is no `complete()`/`setCompleted()` method.** Mark a step done by
 *   setting `completed = true` on the `Step` object you passed in (the default
 *   bond keeps those object references). In `linear` mode `next()`/`goTo()` are
 *   SILENT no-ops past an incomplete, non-optional step — no error, no callback.
 * - `isComplete()` means "every step is `completed` or `optional`", not "the
 *   last step is active"; `next()` on the last step does nothing — submit from
 *   your own Finish button. `validate()` only checks the active step's `error`
 *   string; it does not run your form validation.
 * - `onStepChange` receives the new 0-based INDEX, not the `Step` object.
 * - Call `destroy()` when the owning screen unmounts.
 *
 * @e2e
 * Integration checklist — drive the real rendered wizard in the live preview
 * (no mocks), adapt each item to this app's actual steps/screens, and check
 * every box off one by one. A box you can't check is an integration bug to
 * fix — not a skip:
 * - [ ] The wizard renders every configured step, the active step is visually
 *   distinct (highlighted/current), and progress is shown (e.g. "Step 2 of 4"
 *   or a filled indicator) — the count/order on screen matches the `steps`
 *   config and `getActiveStep()`.
 * - [ ] NEXT advances one step (content + indicator update to the next step)
 *   and PREV/Back returns to the prior step; the first step offers no working
 *   Back and the last step shows a Finish/Submit action instead of Next.
 * - [ ] A step that gates on input blocks NEXT until it is valid/complete —
 *   leaving a required field empty keeps you on the step with a visible error
 *   and the incomplete step cannot be skipped past; a step marked `optional`,
 *   by contrast, CAN be advanced past without completing it.
 * - [ ] A `linear` stepper refuses to jump ahead — clicking an unreached
 *   future step in the indicator (or `goTo(futureIndex)`) does nothing and the
 *   active step stays put; you reach it only by completing the steps before
 *   it. A non-linear stepper lets you navigate directly to any step.
 * - [ ] Completing the final step fires the completion outcome (the form
 *   submits / a success screen appears) and `isComplete()` is true — the
 *   wizard doesn't advance past the end.
 * - [ ] Per-step data survives navigation: enter values on an early step, go
 *   forward, then Back — the earlier step's values are still there, not reset,
 *   and re-editing them and returning keeps the latest input.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
