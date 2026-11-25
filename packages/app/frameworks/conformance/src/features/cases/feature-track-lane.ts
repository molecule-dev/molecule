/**
 * `@molecule/app-feature-track-lane-react` cases: one row of a multi-track
 * timeline — the lane header (only while `name` or `lane` is set), the clip
 * blocks projected through `clipToPixels` on the `pixelsPerSecond` axis, the
 * selection ring, the per-clip label and right-edge resize handle, and the
 * pointer gesture behind it (a press that becomes a move or a resize drag past
 * the distance threshold, a press released in place firing `onClipClick`, a
 * cancel, moves after a release) plus the pure geometry helpers
 * `clipToPixels`, `pixelsToTime` and `clampClipMove`.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Three clips covering a coloured-and-labelled clip, a labelled one and a bare one. */
const clips = [
  { id: 'c1', startTime: 0, duration: 2, color: '#0af', label: 'Kick' },
  { id: 'c2', startTime: 4, duration: 1.5, label: 'Snare' },
  { id: 'c3', startTime: 8, duration: 3 },
]

/** One clip, so a case can assert a single block without the surrounding rows. */
const oneClip = [{ id: 'only', startTime: 0, duration: 2, label: 'Kick' }]

/** Every clip's selector. */
const CLIP = '[data-mol-id="track-lane-clip"]'

/**
 * The selector of one clip's element.
 *
 * @param id - The clip id.
 * @returns The CSS selector.
 */
const clipSelector = (id: string): string => `[data-mol-id="track-lane-clip"][data-clip-id="${id}"]`

/**
 * The selector of one clip's resize handle.
 *
 * @param id - The clip id.
 * @returns The CSS selector.
 */
const handleSelector = (id: string): string =>
  `[data-mol-id="track-lane-clip"][data-clip-id="${id}"] [data-mol-id="track-lane-clip-handle"]`

/** Every callback the component accepts, so the gesture cases record its calls. */
const gestureCallbacks = ['onClipMove', 'onClipResize', 'onClipClick']

/** `@molecule/app-feature-track-lane-react`. */
export const featureTrackLaneFeature: FeatureCases = {
  package: '@molecule/app-feature-track-lane-react',
  values: [
    { export: 'MIN_CLIP_DURATION_SECONDS' },
    { export: 'DRAG_DISTANCE_THRESHOLD_PX' },
    {
      export: 'clipToPixels',
      calls: [
        // The default scale: 2 s at 20 px/s, 1.5 s at 4 s in.
        [{ startTime: 0, duration: 2 }, 20],
        [{ startTime: 4, duration: 1.5 }, 20],
        // Sub-pixel durations floor at one pixel.
        [{ startTime: 0, duration: 0.0001 }, 20],
        [{ startTime: 0, duration: 0 }, 20],
        // A zero or negative scale falls back to 1 px/s.
        [{ startTime: 3, duration: 2 }, 0],
        [{ startTime: 3, duration: 2 }, -10],
        // A fractional scale and a negative start time pass straight through.
        [{ startTime: -1.5, duration: 0.25 }, 2.5],
        [{ startTime: 1.234, duration: 0.5 }, 20],
      ],
    },
    {
      export: 'pixelsToTime',
      calls: [
        [40, 20],
        [0, 20],
        // Negative offsets clamp to zero.
        [-30, 20],
        // A zero or negative scale falls back to 1 px/s.
        [10, 0],
        [10, -10],
        [7.5, 2.5],
      ],
    },
    {
      export: 'clampClipMove',
      calls: [[5], [0], [-1], [-0.001], [1234.5]],
    },
  ],
  families: [
    {
      component: 'TrackLane',
      keyedLists: [{ prop: 'clips', selector: CLIP }],
      cases: [
        { name: 'defaults', props: { clips } },
        { name: 'empty clips', props: { clips: [], name: 'Empty' } },
        // The header renders while either identifier is set; `name` wins as the
        // label and `lane` only reaches the root's `data-lane` + the handlers.
        { name: 'name and lane', props: { name: 'Drums', lane: 'lane-7', clips } },
        { name: 'name only', props: { name: 'Drums', clips } },
        { name: 'lane only', props: { lane: 'lane-7', clips } },
        // `name !== undefined` keeps the header even for a falsy name, and
        // `name ?? headerLabel` only falls back for null/undefined.
        { name: 'empty name', props: { name: '', clips } },
        { name: 'null name', props: { name: null, clips } },
        { name: 'number name', props: { name: 42, clips } },
        {
          name: 'node name',
          props: {
            name: { $nodes: [{ tag: 'strong', attrs: { 'data-name': '' }, children: ['Kit'] }] },
            clips,
          },
        },
        // The scale drives every clip's geometry; zero and negative fall back to 1.
        { name: 'custom scale', props: { clips, pixelsPerSecond: 40 } },
        { name: 'zero scale', props: { clips, pixelsPerSecond: 0 } },
        { name: 'negative scale', props: { clips, pixelsPerSecond: -10 } },
        { name: 'large scale', props: { clips: oneClip, pixelsPerSecond: 1000 } },
        // Geometry edges: a floored width, a fractional start and a negative one.
        {
          name: 'sub-pixel duration',
          props: { clips: [{ id: 'tiny', startTime: 0, duration: 0.0001 }] },
        },
        {
          name: 'fractional geometry',
          props: { clips: [{ id: 'f', startTime: 1.234, duration: 0.5 }] },
        },
        {
          name: 'negative start time',
          props: { clips: [{ id: 'neg', startTime: -2, duration: 1 }] },
        },
        // The row height sets the body's `height` and `min-height`.
        { name: 'custom height', props: { clips, height: 80 } },
        { name: 'zero height', props: { clips: oneClip, height: 0 } },
        // The selection ring is per clip id; an id no clip has selects nothing.
        { name: 'selected clip', props: { clips, selectedClipId: 'c2' } },
        { name: 'selected clip absent', props: { clips, selectedClipId: 'nope' } },
        // A clip's own colour replaces the default fill; its label is a node.
        {
          name: 'clip colors',
          props: {
            clips: [
              { id: 'red', startTime: 0, duration: 1, color: '#f06' },
              { id: 'plain', startTime: 2, duration: 1 },
            ],
          },
        },
        {
          name: 'clip label variants',
          props: {
            clips: [
              { id: 'number', startTime: 0, duration: 1, label: 7 },
              { id: 'empty', startTime: 2, duration: 1, label: '' },
              { id: 'null', startTime: 4, duration: 1, label: null },
            ],
          },
        },
        {
          name: 'node clip label',
          props: {
            clips: [
              {
                id: 'node',
                startTime: 0,
                duration: 1,
                label: { $nodes: [{ tag: 'em', attrs: { 'data-label': '' }, children: ['Bold'] }] },
              },
            ],
          },
        },
        { name: 'className passthrough', props: { clips, className: 'parity-token' } },
        // Handlers present but never fired change nothing in the markup.
        { name: 'callbacks without a gesture', props: { clips }, callbacks: gestureCallbacks },
        // A press released in place is a click, not a drag.
        {
          name: 'click fires onClipClick',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('c2'), event: 'pointerdown', clientX: 100 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 100 },
          ],
        },
        {
          name: 'click passes the lane',
          props: { clips, lane: 'lane-7' },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('c1'), event: 'pointerdown', clientX: 50 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 50 },
          ],
        },
        // Under the drag threshold the press is still a click.
        {
          name: 'a move below the threshold stays a click',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('c2'), event: 'pointerdown', clientX: 100 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 102 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 102 },
          ],
        },
        // Past the threshold a move reports the new start time (origin + dx/scale).
        {
          name: 'dragging moves the clip',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('c2'), event: 'pointerdown', clientX: 100 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 140 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 150 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 150 },
          ],
        },
        {
          name: 'dragging left clamps at zero',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('c1'), event: 'pointerdown', clientX: 200 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 0 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 0 },
          ],
        },
        {
          name: 'dragging from a fractional start',
          props: { clips: [{ id: 'f', startTime: 1.25, duration: 1 }], pixelsPerSecond: 40 },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('f'), event: 'pointerdown', clientX: 100 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 95 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 95 },
          ],
        },
        {
          name: 'dragging passes the lane',
          props: { clips, lane: 'lane-7' },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('c2'), event: 'pointerdown', clientX: 100 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 140 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 140 },
          ],
        },
        // The right-edge handle resizes instead of moving.
        {
          name: 'resize drags the right edge',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: handleSelector('c2'), event: 'pointerdown', clientX: 200 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 240 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 240 },
          ],
        },
        {
          name: 'resize clamps at the minimum',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: handleSelector('c2'), event: 'pointerdown', clientX: 200 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 0 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 0 },
          ],
        },
        {
          name: 'resize shrinks',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: handleSelector('c2'), event: 'pointerdown', clientX: 200 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 180 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 180 },
          ],
        },
        {
          name: 'resize passes the lane',
          props: { clips, lane: 'lane-7' },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: handleSelector('c1'), event: 'pointerdown', clientX: 100 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 120 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 120 },
          ],
        },
        // A cancel ends the gesture as a release does — without the click.
        {
          name: 'pointercancel ends the drag',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('c2'), event: 'pointerdown', clientX: 100 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 140 },
            { type: 'pointer', selector: 'window', event: 'pointercancel', clientX: 140 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 200 },
          ],
        },
        {
          name: 'pointercancel before movement does not click',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('c2'), event: 'pointerdown', clientX: 100 },
            { type: 'pointer', selector: 'window', event: 'pointercancel', clientX: 100 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 140 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 100 },
          ],
        },
        {
          name: 'window blur ends a held clip press',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('c2'), event: 'pointerdown', clientX: 100 },
            { type: 'windowFocus', focused: false },
            { type: 'windowFocus', focused: true },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 140 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 140 },
          ],
        },
        {
          name: 'lost pointer capture ends a held clip press',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('c2'), event: 'pointerdown', clientX: 100 },
            { type: 'pointer', selector: clipSelector('c2'), event: 'lostpointercapture' },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 140 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 140 },
          ],
        },
        {
          name: 'a release past the threshold without a move does not click',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('c2'), event: 'pointerdown', clientX: 100 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 104 },
          ],
        },
        {
          name: 'removing the dragged clip releases the lane',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('c2'), event: 'pointerdown', clientX: 100 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 120 },
            { type: 'props', props: { clips: clips.filter((clip) => clip.id !== 'c2') } },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 140 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 140 },
            { type: 'pointer', selector: clipSelector('c1'), event: 'pointerdown', clientX: 20 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 60 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 60 },
          ],
        },
        // Moves and releases with no press behind them are inert.
        {
          name: 'release without a press is inert',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 40 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 40 },
            { type: 'pointer', selector: 'window', event: 'pointercancel' },
          ],
        },
        {
          name: 'moves after the release are inert',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('c2'), event: 'pointerdown', clientX: 100 },
            { type: 'pointer', selector: clipSelector('c2'), event: 'pointerup', clientX: 100 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 200 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 200 },
          ],
        },
        // The gesture reads the CURRENT scale: the same 120 px is 6 s at 20 px/s
        // and 3 s at 40 px/s.
        {
          name: 'the scale changes mid-gesture',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('c2'), event: 'pointerdown', clientX: 100 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 140 },
            { type: 'props', props: { pixelsPerSecond: 40 } },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 220 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 220 },
          ],
        },
        // Re-renders from the parent: selection, data, scale, name, lane, height.
        {
          name: 'selection changes from the parent',
          props: { clips },
          interactions: [
            { type: 'props', props: { selectedClipId: 'c1' } },
            { type: 'props', props: { selectedClipId: 'c3' } },
            { type: 'props', props: { selectedClipId: undefined } },
          ],
        },
        {
          name: 'clips change from the parent',
          props: { clips },
          interactions: [
            {
              type: 'props',
              props: {
                clips: [
                  { id: 'c2', startTime: 5, duration: 1, label: 'Snare' },
                  { id: 'c4', startTime: 9, duration: 2, color: '#f06' },
                ],
              },
            },
            { type: 'props', props: { clips: [] } },
          ],
        },
        {
          name: 'the scale changes from the parent',
          props: { clips, pixelsPerSecond: 20 },
          interactions: [
            { type: 'props', props: { pixelsPerSecond: 40 } },
            { type: 'props', props: { pixelsPerSecond: 0 } },
          ],
        },
        {
          name: 'name and lane appear after mount',
          props: { clips },
          interactions: [
            { type: 'props', props: { name: 'Drums' } },
            { type: 'props', props: { lane: 'lane-7' } },
          ],
        },
        {
          name: 'name and lane are removed after mount',
          props: { clips, name: 'Drums', lane: 'lane-7' },
          interactions: [
            { type: 'props', props: { name: undefined } },
            { type: 'props', props: { lane: undefined } },
          ],
        },
        {
          name: 'height and className change from the parent',
          props: { clips, height: 44, className: 'parity-token' },
          interactions: [
            { type: 'props', props: { height: 100 } },
            { type: 'props', props: { className: 'other-token' } },
          ],
        },
        {
          name: 'a handler removed after mount stops firing',
          // The handler starts as a `$callback` prop, not a `callbacks` entry,
          // so a later `props` step can take it away again (a `callbacks` entry
          // installs its spy for the whole case, whatever the props say).
          props: { clips, onClipClick: { $callback: 'onClipClick' } },
          callbacks: ['onClipMove', 'onClipResize'],
          interactions: [
            { type: 'props', props: { onClipClick: undefined } },
            { type: 'pointer', selector: clipSelector('c2'), event: 'pointerdown', clientX: 100 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 100 },
          ],
        },
        {
          name: 'a handler added after mount starts firing',
          props: { clips },
          callbacks: gestureCallbacks,
          interactions: [
            { type: 'props', props: { onClipMove: { $callback: 'onClipMove' } } },
            { type: 'pointer', selector: clipSelector('c1'), event: 'pointerdown', clientX: 0 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 60 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 60 },
          ],
        },
        // Every visible string comes from `t()`: a locale switch re-renders it.
        {
          name: 'a locale switch re-renders the labels',
          props: { clips: oneClip, name: 'Drums' },
          callbacks: gestureCallbacks,
          context: {
            translations: {
              de: {
                trackLane: {
                  header: 'Spur',
                  aria: {
                    lane: 'Tonspur {{name}}',
                    resize: 'Clip skalieren',
                    clip: 'Clip {{label}} ab {{startTime}}s für {{duration}}s',
                  },
                },
              },
            },
          },
          interactions: [
            { type: 'locale', locale: 'de' },
            { type: 'locale', locale: 'en' },
          ],
        },
        // The unnamed fallback header text is translated too.
        {
          name: 'the fallback header follows the locale',
          props: { clips, lane: 'lane-7' },
          context: {
            translations: {
              fr: { trackLane: { header: 'Piste' } },
            },
          },
          interactions: [{ type: 'locale', locale: 'fr' }],
        },
      ],
    },
  ],
}
