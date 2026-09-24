/**
 * Tour core interface for molecule.dev.
 *
 * Provides a standardized API for onboarding walkthrough and guided
 * tour UI components. Bond a provider (e.g. `@molecule/app-tour-shepherd`)
 * to supply the concrete implementation.
 *
 * @example
 * ```typescript
 * import 'shepherd.js/dist/css/shepherd.css' // once, in the app entry — the bond does NOT import it
 * import { requireProvider, setProvider } from '@molecule/app-tour'
 * import { createProvider } from '@molecule/app-tour-shepherd'
 *
 * // Startup (bonds.ts). Button labels are rendered by the bond — pass translated strings.
 * setProvider(createProvider({ labels: { back: 'Back', next: 'Next', done: 'Done' } }))
 *
 * let tourSeen = false // persist this per user (your API) so the tour only runs once
 * const tour = requireProvider().createTour({
 *   steps: [
 *     {
 *       target: '[data-mol-id="new-project-button"]',
 *       title: 'Create a project',
 *       content: 'Every app starts here.',
 *     },
 *     { target: '[data-mol-id="editor"]', title: 'Editor', content: 'Write code here.', placement: 'right' },
 *   ],
 *   onComplete: () => {
 *     tourSeen = true // the user clicked Done on the last step
 *   },
 *   onCancel: () => {
 *     tourSeen = true // closed with ✕ / Esc — also counts as seen
 *   },
 * })
 *
 * // Client-only (needs the DOM, never during SSR) and after both targets are rendered:
 * if (!tourSeen) tour.start() // shepherd draws the anchored tooltip, overlay and Back/Next/Done
 * console.log(tour.isActive(), tour.getCurrentStep()) // true 0
 * ```
 *
 * @remarks
 * - **What appears on screen depends on the bond.** `@molecule/app-tour-shepherd`
 *   RENDERS the tooltip, highlight, modal overlay and nav buttons (and needs
 *   `shepherd.js/dist/css/shepherd.css` imported by the app, or it all renders
 *   unstyled). A headless bond only tracks state — then render the step UI
 *   yourself from `getCurrentStep()` and the step's `target`/`title`/`content`,
 *   gating the backdrop/buttons on `hasOverlay()`/`hasButtons()` (resolved:
 *   per-tour option → provider default → `true`).
 * - The instance has NO change subscription — react to steps via each step's
 *   `action` (fires when that step is shown) and to the end via
 *   `onComplete`/`onCancel`, not by polling.
 * - `next()` on the LAST step is a no-op — finish with `complete()` (the Done
 *   button calls it). Persist "tour seen" yourself; nothing is remembered.
 * - `target` is a CSS selector that must match an element that is ALREADY in
 *   the DOM when the step shows — prefer stable `[data-mol-id="…"]` selectors
 *   over styling class names (class strings are ClassMap-bond-owned and
 *   swappable).
 * - Step `title`/`content` are UI text — source them via
 *   `t('key', values, { defaultValue })` in a real app, and style any tour UI
 *   you render yourself with `getClassMap()` from `@molecule/app-ui`.
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
