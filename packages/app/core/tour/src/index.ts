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
 * - **Read the `overlay`/`showButtons` intent back off the instance.** Because
 *   the provider draws nothing, `TourOptions.overlay`/`showButtons` are surfaced
 *   for the consumer via `hasOverlay()`/`hasButtons()` (resolved: per-tour
 *   option → provider default → `true`). Gate the backdrop and nav buttons your
 *   render code paints on those accessors rather than re-deriving the flags.
 * - The instance has NO change subscription — drive re-renders from the
 *   per-step `action` callbacks (or wrap `next`/`previous`), not by polling.
 * - `target` is a CSS selector: prefer stable `[data-mol-id="…"]` selectors
 *   over styling class names (class strings are ClassMap-bond-owned and
 *   swappable).
 * - Step `title`/`content` are UI text — source them via
 *   `t('key', values, { defaultValue })`, and style the rendered tour UI with
 *   `getClassMap()` from `@molecule/app-ui`.
 * - **Wire it with THIS package's `setProvider()` or `bond('tour', …)`.**
 *   `setProvider()` delegates into the shared `@molecule/app-bond` registry, so
 *   both write the same slot; {@link requireProvider} throws until one has run.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual onboarding flow, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip. The
 * provider only tracks state, so every checkpoint is about the overlay the app
 * RENDERS from `getCurrentStep()` — verify what's on screen, not just the calls:
 * - [ ] Starting the tour renders step 1's tooltip (its `title`/`content`)
 *   anchored to that step's `target` element, with the target highlighted /
 *   spotlighted. `start()` alone paints nothing — the per-step `action` is what
 *   draws the overlay, so confirm the anchored tooltip actually appears.
 * - [ ] `next` advances in order: the tooltip + highlight move to each step's
 *   `target` and the progress indicator updates (e.g. "2 of 5" — `getCurrentStep()`
 *   is zero-based, so it reads step+1 of `steps.length`). `previous` moves one
 *   step back. `next` on the LAST step does not wrap or auto-finish (the bond
 *   no-ops past the end), so a visible Done/Finish control must call `complete()`.
 * - [ ] Skip/close (`cancel()`) ends the tour immediately — the overlay and
 *   tooltip disappear, `isActive()` is false — and fires `onCancel`.
 * - [ ] Completing the last step fires `onComplete` and closes the tour (overlay
 *   and tooltip gone, `isActive()` false).
 * - [ ] Seen-once: a returning user who completed OR dismissed the tour is not
 *   shown it again after reload, while a fresh user is. The package has no
 *   built-in "seen" state — the app must persist a flag in `onComplete`/`onCancel`
 *   and gate `start()` on it; verify the persistence survives a reload.
 * - [ ] A step whose `target` selector matches no element is handled gracefully
 *   (the step is skipped or the tour ends) — it never crashes anchoring a tooltip
 *   to a null element (the bond keeps `target` as a plain string and never
 *   touches the DOM, so this guard lives in the app's render code).
 * - [ ] While the tour is active with `overlay` on (i.e. `hasOverlay()` is
 *   true), the backdrop blocks interaction outside the current step — clicks
 *   reach only the tour controls and the highlighted target; ending the tour
 *   restores normal interaction. A tour created with `overlay: false` reports
 *   `hasOverlay() === false` and your render code paints no backdrop. Likewise
 *   gate the nav buttons on `hasButtons()`.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
