/**
 * `ResizeHandle` cases: the drag sash between panels — its two axes (the
 * horizontal default and the vertical one), the full drag lifecycle through
 * Pointer Events (a move before the press, the press, moves that call
 * `onResize` and one that does not, the release, a move after it, a cancel),
 * the keyboard nudge in both axes (and the keys the other axis ignores), the
 * hover highlight and how it hands priority to an active drag, the `className`
 * pass-through, the separator's reported `value` (a focusable separator is the
 * WAI-ARIA window-splitter pattern, so `aria-valuenow` is required) and how a
 * prop update moves it, and the label's locale switch.
 *
 * Enter/leave is driven with the bubbling `pointerover`/`pointerout` events a
 * browser delivers when the pointer crosses the handle's boundary (React
 * derives `onPointerEnter`/`onPointerLeave` from exactly these), not with
 * `mouseenter`/`mouseleave` steps: a real `pointerenter` never bubbles, so it
 * could not reach every framework the same way.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** The handle every interaction targets. */
const HANDLE = '[data-mol-id="workspace-resize-handle"]'

/** `ResizeHandle`. */
export const resizeHandleCases: FeatureComponentCases = {
  component: 'ResizeHandle',
  cases: [
    {
      name: 'a horizontal handle',
      props: { value: 40 },
      callbacks: ['onResize'],
      interactions: [
        // A move before any press is not a drag: no call, no highlight.
        { type: 'pointer', selector: HANDLE, event: 'pointermove', clientX: 40 },
        // Press, then moves: +30 calls, an exact-repeat move is a 0 delta and
        // stays silent, -12 calls.
        { type: 'pointer', selector: HANDLE, event: 'pointerdown', clientX: 100 },
        { type: 'pointer', selector: HANDLE, event: 'pointermove', clientX: 130 },
        { type: 'pointer', selector: HANDLE, event: 'pointermove', clientX: 130 },
        { type: 'pointer', selector: HANDLE, event: 'pointermove', clientX: 118 },
        // Release: the line dims and later moves are inert again.
        { type: 'pointer', selector: HANDLE, event: 'pointerup', clientX: 118 },
        { type: 'pointer', selector: HANDLE, event: 'pointermove', clientX: 140 },
        // The keyboard nudges the split in the axis steps; an unbound key is ignored.
        { type: 'keydown', selector: HANDLE, key: 'ArrowLeft' },
        { type: 'keydown', selector: HANDLE, key: 'ArrowRight' },
        { type: 'keydown', selector: HANDLE, key: 'Home' },
        // A pointercancel ends a drag as a release would.
        { type: 'pointer', selector: HANDLE, event: 'pointerdown', clientX: 200 },
        { type: 'pointer', selector: HANDLE, event: 'pointercancel' },
        { type: 'pointer', selector: HANDLE, event: 'pointermove', clientX: 220 },
      ],
    },
    {
      name: 'a vertical handle with a className',
      props: { direction: 'vertical', className: 'parity-token', value: 65 },
      callbacks: ['onResize'],
      interactions: [
        { type: 'pointer', selector: HANDLE, event: 'pointerdown', clientY: 50 },
        // The vertical axis nudges with the vertical arrows; the horizontal
        // arrows it ignores.
        { type: 'keydown', selector: HANDLE, key: 'ArrowUp' },
        { type: 'keydown', selector: HANDLE, key: 'ArrowDown' },
        { type: 'keydown', selector: HANDLE, key: 'ArrowLeft' },
        { type: 'pointer', selector: HANDLE, event: 'pointerup', clientY: 50 },
        // Re-rendering on the other axis flips the geometry and the keys with it.
        { type: 'props', props: { direction: 'horizontal' } },
        { type: 'keydown', selector: HANDLE, key: 'ArrowRight' },
        { type: 'keydown', selector: HANDLE, key: 'ArrowUp' },
        { type: 'props', props: { className: 'parity-token-wide' } },
      ],
    },
    {
      name: 'hover highlights the line until the pointer leaves',
      props: { value: 50 },
      callbacks: ['onResize'],
      interactions: [
        { type: 'event', selector: HANDLE, event: 'pointerover', bubbles: true },
        { type: 'event', selector: HANDLE, event: 'pointerout', bubbles: true },
        { type: 'event', selector: HANDLE, event: 'pointerover', bubbles: true },
        // A press while hovered keeps the highlight; a leave while DRAGGING
        // must not drop it (drag wins over hover)…
        { type: 'pointer', selector: HANDLE, event: 'pointerdown', clientX: 100 },
        { type: 'event', selector: HANDLE, event: 'pointerout', bubbles: true },
        { type: 'pointer', selector: HANDLE, event: 'pointermove', clientX: 124 },
        // …and the release drops the drag, leaving the pointer outside.
        { type: 'pointer', selector: HANDLE, event: 'pointerup', clientX: 124 },
      ],
    },
    {
      name: 'a locale switch re-renders the aria-label',
      props: { value: 35 },
      callbacks: ['onResize'],
      context: {
        translations: {
          fr: {
            ide: {
              resizeHandle: { label: 'Redimensionner les panneaux' },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
    {
      name: 'the reported value follows the prop',
      props: { value: 40 },
      callbacks: ['onResize'],
      interactions: [{ type: 'props', props: { value: 62.5 } }],
    },
  ],
}
