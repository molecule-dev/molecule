/**
 * When a runner's simulated input may land: never in the millisecond the page last rendered in.
 *
 * A user acts on a page after it has painted, so their input never lands in the millisecond
 * the page's listeners were attached in. An event dispatched in that millisecond can lose part
 * of its path: Vue ignores an event that one of its handlers first saw no later than the moment
 * the next handler was attached (its guard against a handler added during the event's own
 * dispatch), so a click that bubbles from a button to a clickable card reaches only the button.
 * A runner's `setTimeout(0)` waits for one tick of the event loop's millisecond clock, which
 * does not line up with `Date.now()`'s, so a quick case could reach its first event in the
 * mount's millisecond.
 *
 * Both functions poll without yielding, so no timer or promise runs in between and the case
 * sees the same order of work as before. Under fake timers the case's own clock decides, so they
 * return at once; a `Date.now()` that never moves (a test's stub) is left after
 * {@link RENDER_MILLISECOND_LIMIT_MS}.
 *
 * @module
 */

import { vi } from 'vitest'

/** How long {@link afterRenderMillisecond} waits for `Date.now()` to move before it gives up. */
export const RENDER_MILLISECOND_LIMIT_MS = 100

/**
 * Returns once `Date.now()` is past `renderedAt`, the millisecond the case last rendered in.
 * The step runner calls it before each step, with the time of the snapshot after the last one.
 *
 * @param renderedAt - `Date.now()` when the case last rendered.
 */
export function afterRenderMillisecond(renderedAt: number): void {
  if (vi.isFakeTimers()) return
  const giveUpAt = performance.now() + RENDER_MILLISECOND_LIMIT_MS
  while (Date.now() <= renderedAt && performance.now() < giveUpAt) {
    // Polls the clock; the module comment says why this does not yield.
  }
}

/**
 * Returns in a later millisecond than the one it was called in. A runner that dispatches an
 * event straight after rendering, without tracking when it rendered, calls this first.
 */
export function nextMillisecond(): void {
  afterRenderMillisecond(Date.now())
}
