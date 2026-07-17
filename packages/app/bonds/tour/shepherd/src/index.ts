/**
 * Shepherd.js v15 tour provider for `@molecule/app-tour`.
 *
 * A real, rendering tour provider: `createTour()` builds a live
 * `Shepherd.Tour` from the core tour options and shepherd draws the actual
 * step tooltips, highlight, and modal overlay on screen. `start` / `next` /
 * `previous` / `cancel` / `complete` drive the shepherd instance, and the
 * core's active-state + step index stay in sync with shepherd's events. This
 * replaces the previous headless step-state machine — the package now depends
 * on and uses shepherd.js, as its name promises.
 *
 * @example
 * ```typescript
 * // REQUIRED — also `import 'shepherd.js/dist/css/shepherd.css'` in your app
 * // entry (see @remarks), or the tooltip/buttons/overlay render unstyled.
 * import { provider } from '@molecule/app-tour-shepherd'
 * import { setProvider, requireProvider } from '@molecule/app-tour'
 *
 * setProvider(provider) // once, at startup (bonds.ts)
 *
 * const tour = requireProvider().createTour({
 *   steps: [
 *     { target: '[data-mol-id="editor"]', title: 'Editor', content: 'Write code here' },
 *   ],
 *   onComplete: () => markTourSeen(),
 * })
 * tour.start() // shepherd renders the anchored tooltip + overlay
 * ```
 *
 * @remarks
 * - **Import shepherd's stylesheet yourself** — this package does not:
 *   `import 'shepherd.js/dist/css/shepherd.css'` in your app entry. Without it
 *   the tooltip, buttons, arrow, and modal overlay render unstyled/invisible
 *   (same as quill/photoswipe's theme CSS).
 * - **Browser-only.** `start()` runs `new Shepherd.Tour(...).start()`, which
 *   needs a live DOM — start tours in a client-only effect, never during SSR.
 * - **Step mapping.** Each core `TourStep` maps to a
 *   shepherd step: `target` → `attachTo.element` (CSS selector), `placement` →
 *   `attachTo.on` (defaults to `'bottom'` so the tooltip anchors with an
 *   arrow), `title` → `title`, `content` → `text`, `action` → shepherd's
 *   per-step `when.show` hook, `beforeShow` → `beforeShowPromise`.
 * - **`overlay` → `useModalOverlay`.** The resolved `overlay` flag (per-tour
 *   `TourOptions.overlay` → provider default → `true`) becomes shepherd's
 *   `useModalOverlay`, so the darkened backdrop is rendered by shepherd itself
 *   and mirrored on `hasOverlay()`.
 * - **`showButtons` gates the nav buttons.** When the resolved `showButtons`
 *   flag is true, each step gets `Back` / `Next` (or `Done` on the last step)
 *   buttons that drive the tour; when false, no buttons are added.
 *   `hasButtons()` mirrors the flag.
 * - **Button labels are UI text.** shepherd renders the buttons, so the bond
 *   supplies their labels via `ShepherdConfig.labels` — pass translated strings
 *   (`createProvider({ labels: { next: t('tour.next', {}, { defaultValue: 'Next' }) } })`);
 *   omitted labels fall back to English `Back` / `Next` / `Done`. Step
 *   `title`/`content` are the consumer's to i18n via `t('key', v, { defaultValue })`.
 * - **`target`** is a CSS selector: prefer stable `[data-mol-id="…"]` selectors
 *   over styling class names (class strings are ClassMap-bond-owned and swappable).
 * - **Wire it** with `setProvider()` from `@molecule/app-tour` or
 *   `bond('tour', provider)` — both write the same registry slot.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
