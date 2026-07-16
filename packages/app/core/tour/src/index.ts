/**
 * Tour core interface for molecule.dev.
 *
 * Provides a standardized API for onboarding walkthrough and guided
 * tour UI components. Bond a provider (e.g. `@molecule/app-tour-shepherd`)
 * to supply the concrete implementation.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-tour'
 * import { provider } from '@molecule/app-tour-shepherd'
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
 * tour.start()
 * ```
 *
 * @remarks
 * - **The provider manages tour STATE — it does not draw the overlay.** The
 *   bundled bond tracks the active step and fires each step's `action` plus
 *   `onComplete`/`onCancel`; the highlight/tooltip UI is the consumer's to
 *   render from `getCurrentStep()` and the step's `target`/`title`/`content`.
 *   Don't expect `start()` alone to put anything on screen.
 * - The instance has NO change subscription — drive re-renders from the
 *   per-step `action` callbacks (or wrap `next`/`previous`), not by polling.
 * - `target` is a CSS selector: prefer stable `[data-mol-id="…"]` selectors
 *   over styling class names (class strings are ClassMap-bond-owned and
 *   swappable).
 * - Step `title`/`content` are UI text — source them via
 *   `t('key', values, { defaultValue })`, and style the rendered tour UI with
 *   `getClassMap()` from `@molecule/app-ui`.
 * - **Wire the bond at startup** — {@link requireProvider} throws until
 *   `setProvider` has been called.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
