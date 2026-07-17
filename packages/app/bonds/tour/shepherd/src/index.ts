/**
 * Headless tour provider for `@molecule/app-tour` — Shepherd-STYLE step
 * sequencing without the shepherd.js library.
 *
 * IMPORTANT: this bond renders NO tour UI — no overlay, tooltip, highlight,
 * or buttons appear on screen, and it does not depend on or use shepherd.js.
 * It is an in-memory step-state machine: it tracks the active step and fires
 * each step's `action` plus `onComplete`/`onCancel`. Render the tooltip /
 * highlight UI yourself from `getCurrentStep()` and the step's
 * `target`/`title`/`content` — style it via `getClassMap()` from
 * `@molecule/app-ui` and run step text through
 * `t('key', values, { defaultValue })`.
 *
 * The bond draws nothing, but it DOES resolve and expose the `overlay` /
 * `showButtons` intent so your render code can honor it: `hasOverlay()` and
 * `hasButtons()` on the instance return the resolved flag (per-tour
 * `TourOptions` option → provider-level `ShepherdConfig` default → `true`).
 * Gate the backdrop and nav buttons you paint on those accessors.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-tour-shepherd'
 * import { setProvider, requireProvider } from '@molecule/app-tour'
 *
 * setProvider(provider) // once, at startup (bonds.ts)
 *
 * const tour = requireProvider().createTour({
 *   steps: [
 *     { target: '[data-mol-id="editor"]', title: 'Editor', content: 'Write code here',
 *       action: () => renderTourStep(tour.getCurrentStep()) },
 *   ],
 *   onComplete: () => markTourSeen(),
 * })
 * tour.start() // fires step 0's action — YOUR action callback draws the UI
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
