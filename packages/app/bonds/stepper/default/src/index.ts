/**
 * Default provider for `@molecule/app-stepper`.
 *
 * In-memory, headless stepper: step navigation (`next`/`previous`/`goTo`),
 * linear-mode gating, and completion tracking. No DOM, no styling — the app
 * renders the step UI and drives this state machine.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/app-stepper'
 * import { provider } from '@molecule/app-stepper-default'
 *
 * setProvider(provider)
 *
 * const steps = [
 *   { id: 'account', label: 'Account', completed: false },
 *   { id: 'profile', label: 'Profile', completed: false },
 *   { id: 'review', label: 'Review', completed: false, optional: true },
 * ]
 * const stepper = requireProvider().createStepper({
 *   steps,
 *   linear: true,
 *   onStepChange: (i) => render(i),
 * })
 *
 * // Linear mode reads YOUR step objects: mark the current one complete to unlock next().
 * steps[stepper.getActiveStep()].completed = true
 * stepper.next()
 * ```
 *
 * @remarks
 * - **Wire with `setProvider()` from `@molecule/app-stepper` — NOT `bond('stepper', …)`.**
 *   The stepper core keeps its own module-local singleton and never reads the
 *   `@molecule/app-bond` registry: a generic `bond()` call appears to succeed, then
 *   `requireProvider()` throws "not configured" at first use.
 * - **Headless** — the provider owns navigation state only; the app owns all
 *   rendering (step indicators, content, buttons).
 * - **There is no "complete step" method.** The instance shares your step objects:
 *   set `step.completed = true` (or `optional: true`) on the objects you passed to
 *   `createStepper` — linear `next()`/`goTo()` gate on those flags.
 * - Blocked navigation is a SILENT no-op (linear gating, out-of-range `goTo`) — no
 *   error and no `onStepChange` call; check `getActiveStep()` if you need to detect it.
 * - `validate()` only checks the current step's `error` flag; `isComplete()` requires
 *   every non-optional step completed.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
