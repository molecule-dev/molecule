/**
 * `@molecule/app-feature-video-timeline-react` cases: the multi-track timeline —
 * the zoom + mode controls row, the ruler row (ticks, tick labels, the in-ruler
 * playhead and the pointer scrub behind `onSeek`), the scrollable tracks area
 * (one `<TrackLane>` row per track keyed by its id, the tracks playhead), the
 * zoom slider/button calls, the ripple vs insert fan-out of clip drags, and the
 * pure helpers `clampZoom`, `zoomFromWheelDelta`, `computeRulerTicks`,
 * `computeRippleUpdates` and `formatTickTime`.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Two named tracks — a video one and an audio one, three and two clips. */
const tracks = [
  {
    id: 'tv',
    kind: 'video',
    clips: [
      { id: 'v1', startTime: 0, duration: 2, label: 'Intro' },
      { id: 'v2', startTime: 4, duration: 1.5, label: 'Body' },
      { id: 'v3', startTime: 8, duration: 3, label: 'Outro' },
    ],
    name: 'Video 1',
  },
  {
    id: 'ta',
    kind: 'audio',
    clips: [
      { id: 'a1', startTime: 0, duration: 6, label: 'Music' },
      { id: 'a2', startTime: 7, duration: 2, label: 'VO' },
    ],
    name: 'Audio 1',
  },
]

/** One unnamed track of each kind, so the fallback kind labels render. */
const unnamedTracks = [
  { id: 't1', kind: 'video', clips: [] },
  { id: 't2', kind: 'audio', clips: [] },
  { id: 't3', kind: 'subtitle', clips: [] },
]

/** One replacement track set, for a `props` step that swaps the rows. */
const otherTracks = [
  { id: 't9', kind: 'subtitle', clips: [{ id: 's1', startTime: 1, duration: 2 }] },
  { id: 't8', kind: 'video', clips: [] },
]

/** Every callback the component accepts, so the gesture cases record its calls. */
const callbacks = ['onSeek', 'onClipMove', 'onClipResize', 'onZoomChange', 'onClipClick']

/** The lane callback subset a clip gesture can fire. */
const laneCallbacks = ['onClipMove', 'onClipResize', 'onClipClick']

/** The ruler body's selector. */
const RULER = '[data-mol-id="video-timeline-ruler"]'

/** Every clip element's selector. */
const CLIP = '[data-mol-id="track-lane-clip"]'

/**
 * The selector of one clip's element.
 *
 * @param id - The clip id.
 * @returns The CSS selector.
 */
const clipSelector = (id: string): string => `${CLIP}[data-clip-id="${id}"]`

/**
 * The selector of one clip's resize handle.
 *
 * @param id - The clip id.
 * @returns The CSS selector.
 */
const handleSelector = (id: string): string =>
  `${CLIP}[data-clip-id="${id}"] [data-mol-id="track-lane-clip-handle"]`

/** The zoom controls' selectors. */
const ZOOM_OUT = '[data-mol-id="video-timeline-zoom-out"]'
const ZOOM_IN = '[data-mol-id="video-timeline-zoom-in"]'
const ZOOM_SLIDER = '[data-mol-id="video-timeline-zoom-slider"]'

/** `@molecule/app-feature-video-timeline-react`. */
export const featureVideoTimelineFeature: FeatureCases = {
  package: '@molecule/app-feature-video-timeline-react',
  values: [
    { export: 'DEFAULT_PIXELS_PER_SECOND' },
    { export: 'DEFAULT_ZOOM_MIN' },
    { export: 'DEFAULT_ZOOM_MAX' },
    { export: 'DEFAULT_TRACK_HEIGHT' },
    { export: 'DEFAULT_LANE_HEADER_WIDTH' },
    { export: 'DEFAULT_RULER_HEIGHT' },
    { export: 'ZOOM_WHEEL_FACTOR' },
    { export: 'MIN_TICK_PIXEL_SPACING' },
    {
      export: 'clampZoom',
      calls: [
        // Inside the bounds it passes through; outside it clamps.
        [50, 10, 100],
        [5, 10, 100],
        [500, 10, 100],
        // Bounds that include the value exactly.
        [10, 10, 100],
        [100, 10, 100],
        // Non-finite candidates fall back to the minimum.
        [Number.NaN, 10, 100],
        [Number.POSITIVE_INFINITY, 10, 100],
        [Number.NEGATIVE_INFINITY, 10, 100],
        // A fractional value passes through.
        [2.5, 2, 200],
      ],
    },
    {
      export: 'zoomFromWheelDelta',
      calls: [
        // Negative deltaY (scroll up) zooms in by ZOOM_WHEEL_FACTOR.
        [20, -100, 2, 200],
        // Positive deltaY (scroll down) zooms out by 1 / ZOOM_WHEEL_FACTOR.
        [20, 100, 2, 200],
        // A zero deltaY returns the clamped current value.
        [20, 0, 2, 200],
        [200, 0, 2, 200],
        // The result clamps into [min, max].
        [2, 100, 2, 200],
        [200, -100, 2, 200],
        [1, -100, 2, 200],
        [20, -100, 10, 15],
        [20, 100, 10, 15],
      ],
    },
    {
      export: 'computeRulerTicks',
      calls: [
        // 60 s at 20 px/s: 60 px target spacing picks the 2 s interval.
        [60, 20],
        // Zero duration, and zero or negative scale, emit the single 0 tick.
        [0, 20],
        [-10, 20],
        [60, 0],
        [60, -1],
        // A 1 s duration: 0.06 s minimum spacing picks the 0.1 s interval.
        [1, 1000],
        // A duration shorter than the coarsest interval emits only 0.
        [10, 2.5],
        // A two-minute timeline at 10 px/s picks the 10 s interval.
        [120, 10],
        // A fractional duration stops after the last whole tick.
        [10.5, 20],
        [30, 3],
      ],
    },
    {
      export: 'computeRippleUpdates',
      calls: [
        // A zero delta returns just the dragged clip.
        [tracks[0].clips, 'v1', 0],
        // Dragging v1 shifts every later clip on the lane by the same delta.
        [tracks[0].clips, 'v1', 1],
        // Dragging v2 leaves earlier clips alone.
        [tracks[0].clips, 'v2', 5],
        // Negative proposals clamp at zero (the drag, then the later clips).
        [tracks[0].clips, 'v2', -5],
        [tracks[0].clips, 'v1', -1],
        // An id that is not on the lane produces no updates.
        [tracks[0].clips, 'nope', 5],
        // An empty lane produces no updates.
        [[], 'v1', 3],
        // Later is strict: a clip starting exactly at the dragged clip's
        // origin does not shift, and any input order works.
        [
          [
            { id: 'b', startTime: 4, duration: 1 },
            { id: 'a', startTime: 2, duration: 1 },
            { id: 'c', startTime: 2, duration: 1 },
          ],
          'a',
          3,
        ],
        // Fractional times pass through unchanged.
        [[{ id: 'f', startTime: 1.25, duration: 1 }], 'f', 1.5],
      ],
    },
    {
      export: 'formatTickTime',
      calls: [
        // Below a minute: whole seconds, then one decimal place.
        [0],
        [2],
        [2.5],
        [2.25],
        [59.96],
        // At and above a minute: mm:ss.
        [60],
        [61],
        [125],
        [599],
        [600],
        [3599.9],
      ],
    },
  ],
  families: [
    {
      component: 'VideoTimeline',
      keyedLists: [{ prop: 'tracks', selector: '[data-mol-id="video-timeline-track"]' }],
      cases: [
        { name: 'defaults', props: { tracks, currentTime: 0, duration: 60 } },
        { name: 'empty tracks', props: { tracks: [], currentTime: 0, duration: 60 } },
        {
          name: 'unnamed tracks fall back to kind labels',
          props: { tracks: unnamedTracks, currentTime: 0, duration: 10 },
        },
        {
          name: 'track names override the kind label',
          props: {
            tracks: [{ id: 't1', kind: 'audio', clips: [], name: 'Voiceover' }],
            currentTime: 0,
            duration: 10,
          },
        },
        {
          name: 'an empty track name renders as the name',
          props: {
            tracks: [{ id: 't1', kind: 'audio', clips: [], name: '' }],
            currentTime: 0,
            duration: 10,
          },
        },
        { name: 'insert mode', props: { tracks, currentTime: 0, duration: 60, mode: 'insert' } },
        {
          name: 'explicit ripple mode',
          props: { tracks, currentTime: 0, duration: 60, mode: 'ripple' },
        },
        {
          name: 'currentTime positions the playhead',
          props: { tracks, currentTime: 5, duration: 60 },
        },
        {
          name: 'a fractional currentTime',
          props: { tracks, currentTime: 3.2, duration: 60 },
        },
        {
          name: 'a custom scale',
          props: { tracks: [tracks[0]], currentTime: 0, duration: 60, pixelsPerSecond: 50 },
        },
        {
          name: 'a zero scale falls back to 1 px/s',
          props: { tracks: [tracks[0]], currentTime: 0, duration: 60, pixelsPerSecond: 0 },
        },
        {
          name: 'a negative scale falls back to 1 px/s',
          props: { tracks: [tracks[0]], currentTime: 0, duration: 60, pixelsPerSecond: -10 },
        },
        {
          name: 'a zero duration',
          props: { tracks, currentTime: 0, duration: 0 },
        },
        {
          name: 'a negative duration',
          props: { tracks, currentTime: 0, duration: -5 },
        },
        {
          name: 'zoom bounds reach the slider',
          props: {
            tracks: [tracks[0]],
            currentTime: 0,
            duration: 60,
            pixelsPerSecond: 50,
            zoomMin: 5,
            zoomMax: 150,
          },
        },
        {
          name: 'the slider value clamps into the bounds',
          props: { tracks: [tracks[0]], currentTime: 0, duration: 60, pixelsPerSecond: 1 },
          interactions: [{ type: 'props', props: { pixelsPerSecond: 500 } }],
        },
        {
          name: 'a custom track height',
          props: { tracks, currentTime: 0, duration: 60, trackHeight: 80 },
        },
        {
          name: 'a custom ruler height',
          props: { tracks, currentTime: 0, duration: 60, rulerHeight: 40 },
        },
        {
          name: 'a custom lane header width',
          props: { tracks: [tracks[0]], currentTime: 5, duration: 60, laneHeaderWidth: 200 },
        },
        {
          name: 'className passthrough',
          props: { tracks, currentTime: 0, duration: 60, className: 'parity-token' },
        },
        {
          name: 'the selected clip renders the ring',
          props: { tracks, currentTime: 0, duration: 60, selectedClipId: 'v2' },
        },
        {
          name: 'a node clip label',
          props: {
            tracks: [
              {
                id: 't1',
                kind: 'video',
                clips: [
                  {
                    id: 'n',
                    startTime: 0,
                    duration: 2,
                    label: {
                      $nodes: [{ tag: 'em', attrs: { 'data-label': '' }, children: ['Bold'] }],
                    },
                  },
                ],
                name: 'Node',
              },
            ],
            currentTime: 0,
            duration: 10,
          },
        },
        { name: 'callbacks present', props: { tracks, currentTime: 0, duration: 60 }, callbacks },
        // The ruler scrub: a press seeks, moves keep seeking, the release ends it.
        {
          name: 'a ruler press seeks',
          props: { tracks: [tracks[0]], currentTime: 0, duration: 60, pixelsPerSecond: 20 },
          callbacks: ['onSeek'],
          layout: [{ selector: RULER, rect: { x: 40, y: 0, width: 1200, height: 28 } }],
          interactions: [{ type: 'pointer', selector: RULER, event: 'pointerdown', clientX: 140 }],
        },
        {
          name: 'a ruler scrub seeks on every move until the release',
          props: { tracks: [tracks[0]], currentTime: 0, duration: 60, pixelsPerSecond: 20 },
          callbacks: ['onSeek'],
          layout: [{ selector: RULER, rect: { x: 40, y: 0, width: 1200, height: 28 } }],
          interactions: [
            { type: 'pointer', selector: RULER, event: 'pointerdown', clientX: 140 },
            { type: 'pointer', selector: RULER, event: 'pointermove', clientX: 240 },
            { type: 'pointer', selector: RULER, event: 'pointerup', clientX: 240 },
            { type: 'pointer', selector: RULER, event: 'pointermove', clientX: 500 },
            { type: 'pointer', selector: RULER, event: 'pointercancel', clientX: 500 },
          ],
        },
        {
          name: 'seek clamps into [0, duration]',
          props: { tracks: [tracks[0]], currentTime: 0, duration: 10, pixelsPerSecond: 20 },
          callbacks: ['onSeek'],
          layout: [{ selector: RULER, rect: { x: 0, y: 0, width: 1000, height: 28 } }],
          interactions: [
            { type: 'pointer', selector: RULER, event: 'pointerdown', clientX: 800 },
            { type: 'pointer', selector: RULER, event: 'pointerdown', clientX: -50 },
          ],
        },
        {
          name: 'a ruler press without onSeek is inert',
          props: { tracks: [tracks[0]], currentTime: 0, duration: 60 },
          callbacks: laneCallbacks,
          interactions: [{ type: 'pointer', selector: RULER, event: 'pointerdown', clientX: 140 }],
        },
        // Clip gestures through the lanes: insert moves one clip, ripple fans out.
        {
          name: 'an insert-mode drag moves only the dragged clip',
          props: { tracks, currentTime: 0, duration: 60, mode: 'insert' },
          callbacks: laneCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('v1'), event: 'pointerdown', clientX: 0 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 40 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 40 },
          ],
        },
        {
          name: 'a ripple drag shifts later clips on the same track',
          props: { tracks, currentTime: 0, duration: 60 },
          callbacks: laneCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('v1'), event: 'pointerdown', clientX: 0 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 40 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 60 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 60 },
          ],
        },
        {
          name: 'a ripple drag to the left clamps at zero',
          props: { tracks, currentTime: 0, duration: 60 },
          callbacks: laneCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('v2'), event: 'pointerdown', clientX: 200 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 0 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 0 },
          ],
        },
        {
          name: 'a drag on the second track ripples only there',
          props: { tracks, currentTime: 0, duration: 60 },
          callbacks: laneCallbacks,
          interactions: [
            {
              type: 'pointer',
              selector: '[data-track-id="ta"] ' + clipSelector('a2'),
              event: 'pointerdown',
              clientX: 100,
            },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 140 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 140 },
          ],
        },
        {
          name: 'a click without movement fires onClipClick',
          props: { tracks, currentTime: 0, duration: 60 },
          callbacks: laneCallbacks,
          interactions: [
            { type: 'pointer', selector: clipSelector('v1'), event: 'pointerdown', clientX: 50 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 50 },
          ],
        },
        {
          name: 'a handle drag resizes the clip',
          props: { tracks, currentTime: 0, duration: 60 },
          callbacks: laneCallbacks,
          interactions: [
            { type: 'pointer', selector: handleSelector('v1'), event: 'pointerdown', clientX: 40 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 80 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 80 },
          ],
        },
        {
          name: 'the zoom out button zooms out',
          props: { tracks: [tracks[0]], currentTime: 0, duration: 60 },
          callbacks: ['onZoomChange'],
          interactions: [{ type: 'click', selector: ZOOM_OUT }],
        },
        {
          name: 'the zoom in button zooms in',
          props: { tracks: [tracks[0]], currentTime: 0, duration: 60 },
          callbacks: ['onZoomChange'],
          interactions: [{ type: 'click', selector: ZOOM_IN }],
        },
        {
          name: 'the zoom buttons clamp into the bounds',
          props: {
            tracks: [tracks[0]],
            currentTime: 0,
            duration: 60,
            pixelsPerSecond: 200,
            zoomMin: 5,
            zoomMax: 150,
          },
          callbacks: ['onZoomChange'],
          interactions: [
            { type: 'click', selector: ZOOM_IN },
            { type: 'props', props: { pixelsPerSecond: 5 } },
            { type: 'click', selector: ZOOM_OUT },
          ],
        },
        {
          name: 'the zoom buttons without onZoomChange are inert',
          props: { tracks: [tracks[0]], currentTime: 0, duration: 60 },
          interactions: [
            { type: 'click', selector: ZOOM_OUT },
            { type: 'click', selector: ZOOM_IN },
          ],
        },
        {
          name: 'the slider emits onZoomChange and restores',
          props: { tracks: [tracks[0]], currentTime: 0, duration: 60 },
          callbacks: ['onZoomChange'],
          interactions: [{ type: 'input', selector: ZOOM_SLIDER, value: '80' }],
        },
        {
          name: 'the slider input clamps into the bounds',
          props: { tracks: [tracks[0]], currentTime: 0, duration: 60 },
          callbacks: ['onZoomChange'],
          interactions: [{ type: 'input', selector: ZOOM_SLIDER, value: '1000' }],
        },
        // Re-renders from the parent.
        {
          name: 'currentTime changes from the parent',
          props: { tracks, currentTime: 0, duration: 60 },
          interactions: [
            { type: 'props', props: { currentTime: 7 } },
            { type: 'props', props: { currentTime: 0 } },
          ],
        },
        {
          name: 'mode changes from the parent',
          props: { tracks, currentTime: 0, duration: 60 },
          interactions: [
            { type: 'props', props: { mode: 'insert' } },
            { type: 'props', props: { mode: 'ripple' } },
          ],
        },
        {
          name: 'tracks change from the parent',
          props: { tracks, currentTime: 0, duration: 60 },
          interactions: [
            { type: 'props', props: { tracks: otherTracks } },
            { type: 'props', props: { tracks: [] } },
          ],
        },
        {
          name: 'the scale changes from the parent',
          props: { tracks: [tracks[0]], currentTime: 0, duration: 60 },
          interactions: [{ type: 'props', props: { pixelsPerSecond: 40 } }],
        },
        {
          name: 'zoom bounds change from the parent',
          props: { tracks: [tracks[0]], currentTime: 0, duration: 60 },
          interactions: [
            { type: 'props', props: { zoomMin: 5, zoomMax: 150 } },
            { type: 'props', props: { zoomMin: undefined, zoomMax: undefined } },
          ],
        },
        {
          name: 'selection changes from the parent',
          props: { tracks, currentTime: 0, duration: 60, selectedClipId: 'v1' },
          interactions: [
            { type: 'props', props: { selectedClipId: 'a2' } },
            { type: 'props', props: { selectedClipId: undefined } },
          ],
        },
        {
          name: 'layout props change from the parent',
          props: { tracks, currentTime: 0, duration: 60 },
          interactions: [
            { type: 'props', props: { trackHeight: 80 } },
            { type: 'props', props: { rulerHeight: 40 } },
            { type: 'props', props: { laneHeaderWidth: 200 } },
          ],
        },
        {
          name: 'className changes from the parent',
          props: { tracks, currentTime: 0, duration: 60, className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'other-token' } }],
        },
        {
          name: 'a handler removed after mount stops firing',
          // The handler starts as a `$callback` prop, not a `callbacks` entry,
          // so a later `props` step can take it away again (a `callbacks` entry
          // installs its spy for the whole case, whatever the props say).
          props: {
            tracks: [tracks[0]],
            currentTime: 0,
            duration: 60,
            onSeek: { $callback: 'onSeek' },
          },
          layout: [{ selector: RULER, rect: { x: 40, y: 0, width: 1200, height: 28 } }],
          interactions: [
            { type: 'props', props: { onSeek: undefined } },
            { type: 'pointer', selector: RULER, event: 'pointerdown', clientX: 140 },
          ],
        },
        {
          name: 'a handler added after mount starts firing',
          props: { tracks, currentTime: 0, duration: 60 },
          callbacks: laneCallbacks,
          interactions: [
            { type: 'props', props: { onClipClick: { $callback: 'onClipClick' } } },
            { type: 'pointer', selector: clipSelector('v1'), event: 'pointerdown', clientX: 50 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 50 },
          ],
        },
        // Every visible string comes from `t()`: a locale switch re-renders it.
        {
          name: 'a locale switch re-renders the labels',
          props: { tracks: unnamedTracks, currentTime: 3.2, duration: 60 },
          context: {
            translations: {
              de: {
                videoTimeline: {
                  mode: { ripple: 'Schneiden', insert: 'Einfügen' },
                  aria: {
                    ruler: 'Zeitleiste',
                    playhead: 'Abspielkopf bei {{time}}s',
                    zoom: 'Zeitleisten-Zoom',
                    mode: 'Bearbeitungsmodus',
                    root: 'Video-Zeitleiste',
                  },
                  trackKind: { video: 'Bild', audio: 'Ton', subtitle: 'Untertitel' },
                },
              },
            },
          },
          interactions: [
            { type: 'locale', locale: 'de' },
            { type: 'locale', locale: 'en' },
          ],
        },
      ],
    },
  ],
}
