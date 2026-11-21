/**
 * `@molecule/app-feature-image-canvas-react` cases: the canvas region — the
 * `<div role="region">` frame with its pixel size, the `<canvas>` surface with
 * its `data-loading` / `data-error` state and grab cursor, the loading
 * message, the preloaded-`HTMLImageElement` source that skips the loading
 * state, the filter chain, the pointer-drag pan and wheel-zoom callbacks, the
 * `exportRef` handle, and the four framework-free helpers (`clamp`,
 * `composeFilterString`, `screenToCanvas`, `clampPan`).
 *
 * jsdom has no canvas backend and implements no pointer capture: its own
 * `getContext` logs a "Not implemented" error (which the recorder counts as a
 * React warning) and `setPointerCapture` is absent (the component's drag
 * handlers call it). The kit's page supplies both for every case
 * (`installDomGaps`): a canvas with no drawing context, and pointer-capture
 * methods that track the captured ids. The DOM the component renders does not
 * depend on either: `data-loading` stays
 * `"true"` for a URL source because jsdom never fetches an image, and the
 * preloaded element that flips it to `"false"` is handed in as a prop.
 *
 * No case pins `now`: nothing the component renders depends on the clock.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A `src` the component loads into an internal image (never fetched in jsdom). */
const SOURCE = 'data:image/png;base64,STUB'

/** The canvas surface, by its `data-mol-id`. */
const surface = 'canvas[data-mol-id="image-canvas-surface"]'

/** The filter chain every field set, in the documented compose order. */
const ALL_FILTERS = {
  brightness: 1.2,
  contrast: 1.1,
  saturation: 1.3,
  hue: 45,
  sepia: 0.2,
  grayscale: 0.1,
  blur: 2,
  sharpen: 0.5,
}

/** A preloaded `HTMLImageElement` a caller manages, as the `src` prop accepts. */
const preloaded = (): HTMLImageElement => new Image()

/** `@molecule/app-feature-image-canvas-react`. */
export const featureImageCanvasFeature: FeatureCases = {
  package: '@molecule/app-feature-image-canvas-react',
  families: [
    {
      component: 'ImageCanvas',
      cases: [
        // The default mount of a URL source: the 512×512 frame, a canvas whose
        // `data-loading` says the image has not arrived, and the loading text.
        { name: 'defaults, loading a url', props: { src: SOURCE } },
        // A custom pixel size and a caller class on the frame; the passed
        // `onChange` turns the canvas cursor into `grab`.
        {
          name: 'custom size, class and cursor',
          props: { src: SOURCE, width: 320, height: 240, className: 'parity-token' },
          callbacks: ['onChange'],
        },
        // A pre-loaded element skips the loading state entirely.
        { name: 'preloaded image element', props: { src: preloaded() } },
        // The same switch driven by a prop change after mount.
        {
          name: 'source changes from a url to a preloaded image',
          props: { src: SOURCE },
          interactions: [{ type: 'props', props: { src: preloaded() } }],
        },
        // Width and height are the canvas bitmap AND the frame size, so a
        // change re-renders both.
        {
          name: 'size changes from the parent',
          props: { src: SOURCE, width: 320, height: 240 },
          interactions: [{ type: 'props', props: { width: 640, height: 480 } }],
        },
        // The frame class is `cm.cn(className)` only, so it follows the prop.
        {
          name: 'className changes from the parent',
          props: { src: SOURCE, className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'other-token' } }],
        },
        {
          name: 'className removed after mount',
          props: { src: SOURCE, className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: undefined } }],
        },
        // `cursor` reads `onChange`'s presence, so adding the handler changes
        // the canvas style with no state involved.
        {
          name: 'onChange turns the cursor into grab',
          props: { src: SOURCE },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { onChange: { $callback: 'onChange' } } }],
        },
        // Zoom and pan are paint inputs only: the DOM stays the same.
        {
          name: 'zoom and pan are accepted',
          props: { src: SOURCE, zoom: 2, pan: { x: 10, y: 20 } },
        },
        {
          name: 'non-positive zoom falls back to identity',
          props: { src: SOURCE, zoom: 0, pan: { x: -9999, y: 9999 } },
        },
        { name: 'every filter is applied', props: { src: SOURCE, filters: ALL_FILTERS } },
        // A pointer drag reports the proposed pan through `onChange`.
        {
          name: 'dragging pans the image',
          props: { src: SOURCE },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'pointer',
              selector: surface,
              event: 'pointerdown',
              clientX: 100,
              clientY: 100,
            },
            {
              type: 'pointer',
              selector: surface,
              event: 'pointermove',
              clientX: 150,
              clientY: 130,
            },
            { type: 'pointer', selector: surface, event: 'pointerup', clientX: 150, clientY: 130 },
          ],
        },
        // The same drag while the caller holds a zoom: the reported zoom is
        // the sanitised prop, and the pan is clamped for that zoom.
        {
          name: 'a drag under a caller zoom reports the clamped pan',
          props: { src: SOURCE, zoom: 2, pan: { x: 0, y: 0 } },
          callbacks: ['onChange'],
          interactions: [
            { type: 'pointer', selector: surface, event: 'pointerdown', clientX: 0, clientY: 0 },
            { type: 'pointer', selector: surface, event: 'pointermove', clientX: 20, clientY: 10 },
          ],
        },
        // No drag in progress: a move reports nothing.
        {
          name: 'a pointermove without a pointerdown does not pan',
          props: { src: SOURCE },
          callbacks: ['onChange'],
          interactions: [
            { type: 'pointer', selector: surface, event: 'pointermove', clientX: 40, clientY: 40 },
          ],
        },
        // `pointercancel` ends a drag exactly like `pointerup`.
        {
          name: 'pointercancel ends the drag',
          props: { src: SOURCE },
          callbacks: ['onChange'],
          interactions: [
            { type: 'pointer', selector: surface, event: 'pointerdown', clientX: 10, clientY: 10 },
            { type: 'pointer', selector: surface, event: 'pointermove', clientX: 30, clientY: 30 },
            {
              type: 'pointer',
              selector: surface,
              event: 'pointercancel',
              clientX: 30,
              clientY: 30,
            },
            { type: 'pointer', selector: surface, event: 'pointermove', clientX: 60, clientY: 60 },
          ],
        },
        // Without `onChange` a drag is inert (controlled-only).
        {
          name: 'without onChange a drag calls nothing',
          props: { src: SOURCE },
          interactions: [
            {
              type: 'pointer',
              selector: surface,
              event: 'pointerdown',
              clientX: 100,
              clientY: 100,
            },
            {
              type: 'pointer',
              selector: surface,
              event: 'pointermove',
              clientX: 150,
              clientY: 130,
            },
            { type: 'pointer', selector: surface, event: 'pointerup', clientX: 150, clientY: 130 },
          ],
        },
        // A wheel scroll reports the zoomed-out factor (a plain jsdom `wheel`
        // event carries no `deltaY`, so it takes the zoom-out branch).
        {
          name: 'a wheel scroll zooms out',
          props: { src: SOURCE },
          callbacks: ['onChange'],
          interactions: [{ type: 'event', selector: surface, event: 'wheel', bubbles: true }],
        },
        // The imperative export handle is written through `exportRef`.
        {
          name: 'exportRef receives the export handle',
          props: { src: SOURCE, exportRef: { current: null } },
        },
        // Leaving the page leaves nothing behind.
        {
          name: 'leaving the page tears the canvas down',
          props: { src: SOURCE },
          interactions: [{ type: 'unmount' }],
        },
      ],
    },
  ],
  values: [
    {
      export: 'clamp',
      calls: [
        [0.5, 0, 1],
        [-1, 0, 1],
        [2, 0, 1],
        [Number.NaN, 0, 1],
        [Number.POSITIVE_INFINITY, 5, 10],
        [-1, -10, 10],
      ],
    },
    {
      export: 'composeFilterString',
      calls: [
        [],
        [undefined],
        [{}],
        [{ brightness: 1, contrast: 1, saturation: 1 }],
        [{ brightness: 1.2, contrast: 1.1, saturation: 0.9 }],
        [{ brightness: -1 }],
        [{ contrast: -2 }],
        [{ saturation: -0.5 }],
        [{ hue: 90 }],
        [{ hue: -30 }],
        [{ hue: 720 }],
        [{ sepia: 0.5 }],
        [{ sepia: 2 }],
        [{ sepia: -1 }],
        [{ grayscale: 0.25 }],
        [{ grayscale: 9 }],
        [{ blur: 4 }],
        [{ blur: -3 }],
        [{ sharpen: 0 }],
        [{ sharpen: 1 }],
        [{ sharpen: 0.5 }],
        [{ sharpen: 5 }],
        [ALL_FILTERS],
        [{ brightness: Number.NaN, contrast: Number.POSITIVE_INFINITY }],
      ],
    },
    {
      export: 'screenToCanvas',
      calls: [
        [
          { x: 100, y: 100 },
          { width: 200, height: 200 },
          { width: 400, height: 400 },
          1,
          { x: 0, y: 0 },
        ],
        [
          { x: 200, y: 200 },
          { width: 200, height: 200 },
          { width: 400, height: 400 },
          2,
          { x: 0, y: 0 },
        ],
        [
          { x: 100, y: 100 },
          { width: 200, height: 200 },
          { width: 400, height: 400 },
          1,
          { x: 50, y: 50 },
        ],
        [
          { x: 100, y: 100 },
          { width: 200, height: 200 },
          { width: 400, height: 400 },
          0,
          { x: 0, y: 0 },
        ],
        [
          { x: 100, y: 100 },
          { width: 200, height: 200 },
          { width: 400, height: 400 },
          Number.NaN,
          { x: 0, y: 0 },
        ],
      ],
    },
    {
      export: 'clampPan',
      calls: [
        [{ x: 10, y: 20 }, { width: 400, height: 400 }, { width: 200, height: 200 }, 1],
        [{ x: 9999, y: -9999 }, { width: 400, height: 400 }, { width: 200, height: 200 }, 1],
        [{ x: 9999, y: 0 }, { width: 400, height: 400 }, { width: 200, height: 200 }, 2],
        [
          { x: Number.NaN, y: Number.POSITIVE_INFINITY },
          { width: 400, height: 400 },
          { width: 200, height: 200 },
          1,
        ],
      ],
    },
  ],
}
