/**
 * `@molecule/app-carousel-react` cases: the image / card carousel, its slide
 * track, the prev/next arrows, the dot strip, the controlled-optional index and
 * the autoplay timer.
 *
 * Slides are `children` (React nodes), so each case passes element slides —
 * plus one plain text slide, which React wraps in a slide `<div>` like any
 * other child. Autoplay cases set `fakeTimers` and drive the interval with
 * `advance` steps; a case that hovers passes `className: 'parity-token'` so the
 * root `<div>` (React renders no `data-mol-id` on it) has a stable selector.
 *
 * @remarks
 * A ONE-slide case cannot be recorded: React's `Carousel` reads
 * `children.length` / `children.map(...)`, and a JSX (or kit) single child is
 * one element rather than an array, so it throws `children.map is not a
 * function` before rendering. Every port handles one slide (the ported unit
 * suites assert it); the multi-child cases below cover the `total > 1`
 * branches through `showArrows` / `showDots`.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** One slide element, named by its number. */
const slide = (n: number): { tag: string; attrs: Record<string, string>; children: string[] } => ({
  tag: 'div',
  attrs: { 'data-slide': String(n) },
  children: [`slide-${n}`],
})

/** Three slides, the default case's children. */
const THREE = [slide(0), slide(1), slide(2)]

/** `@molecule/app-carousel-react`. */
export const carouselFeature: FeatureCases = {
  package: '@molecule/app-carousel-react',
  families: [
    {
      component: 'Carousel',
      cases: [
        { name: 'renders nothing when there are no slides', children: [] },
        { name: 'renders the slides, the arrows and the dot strip by default', children: THREE },
        {
          name: 'renders a plain text slide between element slides',
          children: [slide(0), 'plain text', slide(2)],
        },
        {
          name: 'hides the arrows when showArrows is false',
          props: { showArrows: false },
          children: THREE,
        },
        {
          name: 'hides the dot strip when showDots is false',
          props: { showDots: false },
          children: THREE,
        },
        {
          name: 'hides the arrows and the dots when both are false',
          props: { showArrows: false, showDots: false },
          children: THREE,
        },
        {
          name: 'honours a controlled index',
          props: { index: 2 },
          children: THREE,
        },
        {
          name: 'renders no current slide when the controlled index is out of range',
          props: { index: 5 },
          children: THREE,
        },
        {
          name: 'forwards className onto the root element',
          props: { className: 'parity-token' },
          children: [slide(0), slide(1)],
        },
        {
          name: 'the next arrow advances the uncontrolled index',
          children: THREE,
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: 'button[aria-label="Next"]' }],
        },
        {
          name: 'the previous arrow wraps to the last slide when looping',
          children: THREE,
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: 'button[aria-label="Previous"]' }],
        },
        {
          name: 'the previous arrow clamps at the first slide when loop is false',
          props: { loop: false },
          children: THREE,
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: 'button[aria-label="Previous"]' }],
        },
        {
          name: 'the next arrow clamps at the last slide when loop is false',
          props: { loop: false, index: 2 },
          children: THREE,
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: 'button[aria-label="Next"]' }],
        },
        {
          name: 'a dot jumps to its slide',
          children: THREE,
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: 'button[aria-label="Go to slide 3"]' }],
        },
        {
          name: 'a controlled index ignores the arrows without onChange',
          props: { index: 0 },
          children: THREE,
          interactions: [{ type: 'click', selector: 'button[aria-label="Next"]' }],
        },
        {
          name: 'a controlled index reports the next slide through onChange',
          props: { index: 0 },
          children: THREE,
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: 'button[aria-label="Next"]' }],
        },
        {
          name: 'autoplay advances on its interval',
          props: { autoplayMs: 4000 },
          children: THREE,
          callbacks: ['onChange'],
          fakeTimers: true,
          interactions: [
            { type: 'advance', ms: 4000 },
            { type: 'advance', ms: 4000 },
          ],
        },
        {
          name: 'autoplay wraps from the last slide when looping',
          props: { autoplayMs: 4000, index: 2 },
          children: THREE,
          callbacks: ['onChange'],
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 4000 }],
        },
        {
          name: 'autoplay clamps at the last slide when loop is false',
          props: { autoplayMs: 4000, loop: false, index: 2 },
          children: THREE,
          callbacks: ['onChange'],
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 4000 }],
        },
        {
          name: 'autoplay pauses while the pointer is over the carousel',
          props: { autoplayMs: 4000, className: 'parity-token' },
          children: THREE,
          callbacks: ['onChange'],
          fakeTimers: true,
          interactions: [
            { type: 'mouseenter', selector: '.parity-token' },
            { type: 'advance', ms: 4000 },
            { type: 'mouseleave', selector: '.parity-token' },
            { type: 'advance', ms: 4000 },
          ],
        },
        {
          name: 'autoplay keeps running on hover when pauseOnHover is false',
          props: { autoplayMs: 4000, pauseOnHover: false, className: 'parity-token' },
          children: THREE,
          callbacks: ['onChange'],
          fakeTimers: true,
          interactions: [
            { type: 'mouseenter', selector: '.parity-token' },
            { type: 'advance', ms: 4000 },
          ],
        },
        {
          name: 'autoplayMs 0 disables autoplay',
          children: THREE,
          callbacks: ['onChange'],
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 10000 }],
        },
        {
          name: 'a changed controlled index moves the track',
          props: { index: 0 },
          children: THREE,
          interactions: [{ type: 'props', props: { index: 2 } }],
        },
        {
          name: 'a prop change can turn the arrows off',
          children: THREE,
          interactions: [{ type: 'props', props: { showArrows: false } }],
        },
        {
          name: 'a prop change can start autoplay',
          children: THREE,
          callbacks: ['onChange'],
          fakeTimers: true,
          interactions: [
            { type: 'props', props: { autoplayMs: 4000 } },
            { type: 'advance', ms: 4000 },
          ],
        },
      ],
    },
  ],
}
