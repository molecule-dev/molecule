/**
 * `@molecule/app-reading-progress-bar-react` cases: the bar's defaults, both
 * pinning variants, thickness/color/className/dataMolId passthrough, and the
 * progress it measures — from the whole window, and from a `containerRef`
 * article that starts below the viewport, is halfway read, is fully read, fits
 * inside the viewport, is swapped after mount, added after mount and removed
 * after mount.
 *
 * The two exported pure functions are compared by value. Their calls use an
 * element whose bounding rect is fixed, so the arithmetic is compared without
 * any layout: `getBoundingClientRect` is the only method the formula reads.
 *
 * Progress only changes on a `requestAnimationFrame` tick, so every case that
 * supplies a `containerRef` fakes timers and advances the clock: the first
 * snapshot then shows the initial 0% and the next one the measured value on
 * every framework, instead of depending on when a real frame happens to fire.
 *
 * `ReadingProgressBar` is the package's only runtime component; there are no
 * callbacks to record.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/**
 * A bounding rect with the fields the progress formula reads.
 *
 * @param top - The element's top edge relative to the viewport.
 * @param height - The element's height.
 * @returns A DOMRect-shaped value.
 */
const rectAt = (top: number, height: number): DOMRect => ({
  top,
  height,
  bottom: top + height,
  left: 0,
  right: 0,
  width: 0,
  x: 0,
  y: top,
  toJSON: () => ({ top, height, bottom: top + height }),
})

/**
 * A real element whose bounding rect is the given one, standing in for an
 * article in a laid-out page.
 *
 * @param top - The element's top edge relative to the viewport.
 * @param height - The element's height.
 * @returns The element, for a `containerRef` or a value call.
 */
const articleAt = (top: number, height: number): Element => {
  const el = document.createElement('article')
  el.getBoundingClientRect = () => rectAt(top, height)
  return el
}

/** A `containerRef` the React package reads as `{ current }`. */
const refTo = (el: Element): { current: Element } => ({ current: el })

/** `@molecule/app-reading-progress-bar-react`. */
export const readingProgressBarFeature: FeatureCases = {
  package: '@molecule/app-reading-progress-bar-react',
  values: [
    {
      export: 'computeArticleProgress',
      calls: [
        // Below the viewport top: nothing read yet.
        [articleAt(100, 2000), 800],
        // Halfway scrolled through: (2000 - 800) total, 600 scrolled.
        [articleAt(-600, 2000), 800],
        [articleAt(-100, 1000), 800],
        // Fully read: scrolled past the element's last screen.
        [articleAt(-5000, 2000), 800],
        // Shorter than the viewport: fully read once its top reaches the top.
        [articleAt(-10, 200), 800],
        [articleAt(50, 200), 800],
        // Top exactly at the viewport top: not scrolled yet.
        [articleAt(0, 1000), 800],
      ],
    },
    // No argument list is needed to change the answer: jsdom reports an
    // unscrolled, unscrollable document, so the window formula is 0.
    { export: 'computeWindowProgress', calls: [[]] },
  ],
  families: [
    {
      component: 'ReadingProgressBar',
      cases: [
        { name: 'defaults' },
        { name: 'explicit top position', props: { position: 'top' } },
        { name: 'bottom position', props: { position: 'bottom' } },
        { name: 'zero thickness', props: { thickness: 0 } },
        { name: 'custom thickness and color', props: { thickness: 6, color: '#ff0000' } },
        {
          name: 'className and dataMolId passthrough',
          props: { className: 'parity-token', dataMolId: 'reading-x' },
        },
        {
          name: 'a containerRef before the article top',
          props: { containerRef: refTo(articleAt(100, 2000)) },
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 32 }],
        },
        {
          name: 'a containerRef halfway through the article',
          props: { containerRef: refTo(articleAt(-600, 2000)) },
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 32 }],
        },
        {
          name: 'a containerRef past the article end',
          props: { containerRef: refTo(articleAt(-5000, 2000)) },
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 32 }],
        },
        {
          name: 'a containerRef on an article shorter than the viewport',
          props: { containerRef: refTo(articleAt(-10, 200)) },
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 32 }],
        },
        {
          name: 'a window scroll event',
          interactions: [{ type: 'event', selector: 'window', event: 'scroll' }],
        },
        {
          name: 'a window resize event',
          interactions: [{ type: 'event', selector: 'window', event: 'resize' }],
        },
        {
          name: 'prop changes',
          interactions: [
            { type: 'props', props: { position: 'bottom' } },
            { type: 'props', props: { thickness: 8, color: '#00ff00' } },
            { type: 'props', props: { dataMolId: 'reading-changed', className: 'parity-token' } },
            { type: 'props', props: { position: 'top' } },
          ],
        },
        {
          name: 'a containerRef swapped after mount',
          props: { containerRef: refTo(articleAt(100, 2000)) },
          fakeTimers: true,
          interactions: [
            { type: 'props', props: { containerRef: refTo(articleAt(-5000, 2000)) } },
            { type: 'advance', ms: 32 },
          ],
        },
        {
          name: 'a containerRef added after mount',
          fakeTimers: true,
          interactions: [
            { type: 'props', props: { containerRef: refTo(articleAt(-600, 2000)) } },
            { type: 'advance', ms: 32 },
          ],
        },
        {
          name: 'a containerRef removed after mount',
          props: { containerRef: refTo(articleAt(-600, 2000)) },
          fakeTimers: true,
          interactions: [
            { type: 'props', props: { containerRef: null } },
            { type: 'advance', ms: 32 },
          ],
        },
        {
          name: 'an article read while pinned to the bottom',
          props: { containerRef: refTo(articleAt(-600, 2000)), position: 'bottom' },
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 32 }],
        },
      ],
    },
  ],
}
