/**
 * `@molecule/app-feature-video-scrubber-react` cases: the frame-accurate
 * scrubber's filmstrip cells, playhead, frame readout, click/drag seeking,
 * keyboard stepping, plus its frame/time/thumbnail helpers and defaults.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Thumbnails with a gap in the middle, so cell picking repeats the nearest neighbour. */
const thumbnails = [
  { time: 0, src: 'a.png' },
  { time: 5, src: 'b.png' },
  { time: 10, src: 'c.png' },
  { time: 20, src: 'd.png' },
]

/** A second, differently-shimmed set, for a `thumbnails` prop change. */
const otherThumbnails = [
  { time: 0, src: 'x.png' },
  { time: 30, src: 'y.png' },
  { time: 60, src: 'z.png' },
]

/** The seekable strip whose bounding box turns a pointer position into a time. */
const stripSelector = '[data-mol-id="video-scrubber-strip"]'

/** A 200×48 strip starting at the viewport origin: `clientX / 200` is the time ratio. */
const stripLayout = [{ selector: stripSelector, rect: { x: 0, width: 200, height: 48 } }]

/** `@molecule/app-feature-video-scrubber-react`. */
export const featureVideoScrubberFeature: FeatureCases = {
  package: '@molecule/app-feature-video-scrubber-react',
  families: [
    {
      component: 'VideoScrubber',
      cases: [
        { name: 'defaults', props: { duration: 60, currentTime: 0 } },
        {
          name: 'id and className passthrough',
          props: { duration: 60, currentTime: 0, id: 'my-scrubber', className: 'parity-token' },
        },
        {
          name: 'className change',
          props: { duration: 60, currentTime: 0, className: 'first-class' },
          interactions: [{ type: 'props', props: { className: 'second-class' } }],
        },
        { name: 'playhead at the midpoint', props: { duration: 60, currentTime: 15 } },
        {
          name: 'playhead past the duration clamps',
          props: { duration: 60, currentTime: 120 },
        },
        { name: 'a negative currentTime clamps to zero', props: { duration: 60, currentTime: -5 } },
        {
          name: 'a non-finite currentTime renders at zero',
          props: { duration: 60, currentTime: NaN },
        },
        { name: 'zero duration', props: { duration: 0, currentTime: 5 } },
        { name: 'negative duration', props: { duration: -10, currentTime: 3 } },
        { name: 'a non-finite duration', props: { duration: NaN, currentTime: 3 } },
        {
          name: 'an invalid fps falls back to the default',
          props: { duration: 60, currentTime: 1, fps: 0 },
        },
        {
          name: 'a non-finite fps falls back to the default',
          props: { duration: 60, currentTime: 1, fps: NaN },
        },
        { name: 'a custom fps', props: { duration: 60, currentTime: 1, fps: 30 } },
        { name: 'a fractional fps', props: { duration: 60, currentTime: 1, fps: 23.976 } },
        {
          name: 'the frame readout hidden',
          props: { duration: 60, currentTime: 1, showFrameNumber: false },
        },
        {
          name: 'the frame readout toggled',
          props: { duration: 60, currentTime: 1, showFrameNumber: true },
          interactions: [{ type: 'props', props: { showFrameNumber: false } }],
        },
        {
          name: 'a custom thumbnail count',
          props: { duration: 60, currentTime: 0, thumbnailCount: 8 },
        },
        { name: 'one thumbnail cell', props: { duration: 60, currentTime: 0, thumbnailCount: 1 } },
        {
          name: 'a zero thumbnail count clamps to one cell',
          props: { duration: 60, currentTime: 0, thumbnailCount: 0 },
        },
        {
          name: 'a large thumbnail count',
          props: { duration: 60, currentTime: 0, thumbnailCount: 40 },
        },
        {
          name: 'a fractional thumbnail count rounds',
          props: { duration: 60, currentTime: 0, thumbnailCount: 3.6 },
        },
        {
          name: 'a custom thumbnail height',
          props: { duration: 60, currentTime: 0, thumbnailHeight: 72 },
        },
        {
          name: 'thumbnails pick the closest cell',
          props: { duration: 60, currentTime: 0, thumbnailCount: 3, thumbnails },
        },
        {
          name: 'unsorted thumbnails',
          props: {
            duration: 60,
            currentTime: 0,
            thumbnailCount: 4,
            thumbnails: [thumbnails[3]!, thumbnails[0]!, thumbnails[2]!, thumbnails[1]!],
          },
        },
        { name: 'an empty thumbnail list', props: { duration: 60, thumbnails: [] } },
        {
          name: 'thumbnails change',
          props: { duration: 60, currentTime: 0, thumbnailCount: 4, thumbnails },
          interactions: [{ type: 'props', props: { thumbnails: otherThumbnails } }],
        },
        {
          name: 'currentTime and duration change',
          props: { duration: 60, currentTime: 0 },
          interactions: [{ type: 'props', props: { currentTime: 45, duration: 120 } }],
        },
        {
          name: 'click seeks to the clicked ratio',
          props: { duration: 60, currentTime: 0 },
          callbacks: ['onSeek'],
          layout: stripLayout,
          interactions: [
            { type: 'pointer', selector: stripSelector, event: 'pointerdown', clientX: 50 },
          ],
        },
        {
          name: 'a click before the strip clamps to zero',
          props: { duration: 60, currentTime: 0 },
          callbacks: ['onSeek'],
          layout: [{ selector: stripSelector, rect: { x: 100, width: 200, height: 48 } }],
          interactions: [
            { type: 'pointer', selector: stripSelector, event: 'pointerdown', clientX: 0 },
          ],
        },
        {
          name: 'a click past the strip clamps to the duration',
          props: { duration: 60, currentTime: 0 },
          callbacks: ['onSeek'],
          layout: [{ selector: stripSelector, rect: { x: 0, width: 100, height: 48 } }],
          interactions: [
            { type: 'pointer', selector: stripSelector, event: 'pointerdown', clientX: 9999 },
          ],
        },
        {
          name: 'a zero-width strip seeks to zero',
          props: { duration: 60, currentTime: 0 },
          callbacks: ['onSeek'],
          layout: [{ selector: stripSelector, rect: { x: 0, width: 0, height: 48 } }],
          interactions: [
            { type: 'pointer', selector: stripSelector, event: 'pointerdown', clientX: 50 },
          ],
        },
        {
          name: 'dragging scrubs while the press is held',
          props: { duration: 60, currentTime: 0 },
          callbacks: ['onSeek'],
          layout: stripLayout,
          interactions: [
            { type: 'pointer', selector: stripSelector, event: 'pointerdown', clientX: 20 },
            { type: 'pointer', selector: stripSelector, event: 'pointermove', clientX: 60 },
            { type: 'pointer', selector: stripSelector, event: 'pointermove', clientX: 100 },
            { type: 'pointer', selector: stripSelector, event: 'pointerup', clientX: 100 },
          ],
        },
        {
          name: 'a move without a press does nothing',
          props: { duration: 60, currentTime: 0 },
          callbacks: ['onSeek'],
          layout: stripLayout,
          interactions: [
            { type: 'pointer', selector: stripSelector, event: 'pointermove', clientX: 60 },
          ],
        },
        {
          name: 'a cancelled press ends the drag',
          props: { duration: 60, currentTime: 0 },
          callbacks: ['onSeek'],
          layout: stripLayout,
          interactions: [
            { type: 'pointer', selector: stripSelector, event: 'pointerdown', clientX: 20 },
            { type: 'pointer', selector: stripSelector, event: 'pointercancel', clientX: 20 },
            { type: 'pointer', selector: stripSelector, event: 'pointermove', clientX: 120 },
          ],
        },
        {
          name: 'a released press stops scrubbing',
          props: { duration: 60, currentTime: 0 },
          callbacks: ['onSeek'],
          layout: stripLayout,
          interactions: [
            { type: 'pointer', selector: stripSelector, event: 'pointerdown', clientX: 20 },
            { type: 'pointer', selector: stripSelector, event: 'pointerup', clientX: 20 },
            { type: 'pointer', selector: stripSelector, event: 'pointermove', clientX: 120 },
          ],
        },
        {
          name: 'scrubbing follows the pointer outside the strip until release',
          props: { duration: 60, currentTime: 0 },
          callbacks: ['onSeek'],
          layout: stripLayout,
          interactions: [
            { type: 'pointer', selector: stripSelector, event: 'pointerdown', clientX: 20 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 60 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 100 },
            { type: 'pointer', selector: stripSelector, event: 'pointermove', clientX: 120 },
          ],
        },
        {
          name: 'window blur ends scrubbing',
          props: { duration: 60, currentTime: 0 },
          callbacks: ['onSeek'],
          layout: stripLayout,
          interactions: [
            { type: 'pointer', selector: stripSelector, event: 'pointerdown', clientX: 20 },
            { type: 'windowFocus', focused: false },
            { type: 'windowFocus', focused: true },
            { type: 'pointer', selector: stripSelector, event: 'pointermove', clientX: 120 },
            { type: 'pointer', selector: stripSelector, event: 'pointerup', clientX: 120 },
          ],
        },
        {
          name: 'lost pointer capture ends scrubbing',
          props: { duration: 60, currentTime: 0 },
          callbacks: ['onSeek'],
          layout: stripLayout,
          interactions: [
            { type: 'pointer', selector: stripSelector, event: 'pointerdown', clientX: 20 },
            { type: 'pointer', selector: stripSelector, event: 'lostpointercapture' },
            { type: 'pointer', selector: stripSelector, event: 'pointermove', clientX: 120 },
            { type: 'pointer', selector: stripSelector, event: 'pointerup', clientX: 120 },
          ],
        },
        {
          name: 'disabling and restoring seeking during a press ends scrubbing',
          props: { duration: 60, currentTime: 0, onSeek: { $callback: 'onSeek' } },
          layout: stripLayout,
          interactions: [
            { type: 'pointer', selector: stripSelector, event: 'pointerdown', clientX: 20 },
            { type: 'props', props: { onSeek: undefined } },
            { type: 'props', props: { onSeek: { $callback: 'onSeek' } } },
            { type: 'pointer', selector: stripSelector, event: 'pointermove', clientX: 120 },
            { type: 'pointer', selector: stripSelector, event: 'pointerup', clientX: 120 },
            { type: 'pointer', selector: stripSelector, event: 'pointerdown', clientX: 160 },
            { type: 'pointer', selector: stripSelector, event: 'pointerup', clientX: 160 },
          ],
        },
        {
          name: 'arrow keys step one frame',
          props: { duration: 60, currentTime: 1 },
          callbacks: ['onSeek'],
          interactions: [
            { type: 'keydown', selector: stripSelector, key: 'ArrowRight' },
            { type: 'keydown', selector: stripSelector, key: 'ArrowLeft' },
          ],
        },
        {
          name: 'shift + arrows step one second',
          props: { duration: 60, currentTime: 5 },
          callbacks: ['onSeek'],
          interactions: [
            { type: 'keydown', selector: stripSelector, key: 'ArrowRight', shiftKey: true },
            { type: 'keydown', selector: stripSelector, key: 'ArrowLeft', shiftKey: true },
          ],
        },
        {
          name: 'PageUp and PageDown step ten frames',
          props: { duration: 60, currentTime: 2 },
          callbacks: ['onSeek'],
          interactions: [
            { type: 'keydown', selector: stripSelector, key: 'PageDown' },
            { type: 'keydown', selector: stripSelector, key: 'PageUp' },
          ],
        },
        {
          name: 'Home and End jump to the ends',
          props: { duration: 60, currentTime: 5 },
          callbacks: ['onSeek'],
          interactions: [
            { type: 'keydown', selector: stripSelector, key: 'Home' },
            { type: 'keydown', selector: stripSelector, key: 'End' },
          ],
        },
        {
          name: 'stepping clamps at zero',
          props: { duration: 60, currentTime: 0 },
          callbacks: ['onSeek'],
          interactions: [{ type: 'keydown', selector: stripSelector, key: 'ArrowLeft' }],
        },
        {
          name: 'stepping clamps at the duration',
          props: { duration: 10, currentTime: 10 },
          callbacks: ['onSeek'],
          interactions: [{ type: 'keydown', selector: stripSelector, key: 'End' }],
        },
        {
          name: 'an unrelated key is ignored',
          props: { duration: 60, currentTime: 3 },
          callbacks: ['onSeek'],
          interactions: [{ type: 'keydown', selector: stripSelector, key: 'a' }],
        },
        {
          name: 'without onSeek clicks and keys do nothing',
          props: { duration: 60, currentTime: 3 },
          layout: stripLayout,
          interactions: [
            { type: 'pointer', selector: stripSelector, event: 'pointerdown', clientX: 100 },
            { type: 'keydown', selector: stripSelector, key: 'ArrowRight' },
          ],
        },
      ],
    },
  ],
  values: [
    { export: 'DEFAULT_FPS' },
    { export: 'DEFAULT_THUMBNAIL_COUNT' },
    { export: 'DEFAULT_THUMBNAIL_HEIGHT' },
    {
      export: 'timeToFrame',
      calls: [
        [0, 24],
        [1, 24],
        [0.5, 24],
        [0.041, 24],
        [NaN, 24],
        [Infinity, 24],
        [-1, 24],
        [1, 0],
        [1, -10],
        [1, NaN],
        [60, 24],
      ],
    },
    {
      export: 'frameToTime',
      calls: [
        [0, 24],
        [24, 24],
        [12, 24],
        [-1, 24],
        [10, 0],
        [NaN, 24],
        [10, NaN],
        [10, -24],
      ],
    },
    {
      export: 'snapTimeToFrame',
      calls: [
        [0.04, 24, 60],
        [-1, 24, 60],
        [120, 24, 60],
        [5, 24, 0],
        [5, 24, -1],
        [NaN, 24, 60],
        [30, 24, 60],
        [30, 24, 0],
        [60, 24, 60],
        [5, 0, 60],
        [5, NaN, 60],
        [5, 24, NaN],
        [0, 24, 60],
      ],
    },
    {
      export: 'computeFilmstripTicks',
      calls: [
        [60, 6],
        [60, 1],
        [60, 0],
        [60, -5],
        [60, 100000],
        [0, 4],
        [60, 3.6],
        [NaN, 4],
        [60, NaN],
        [60, 2],
        [-10, 3],
      ],
    },
    {
      export: 'selectClosestThumbnail',
      calls: [
        [thumbnails, 0],
        [thumbnails, 4],
        [thumbnails, 7],
        [thumbnails, 7.5],
        [thumbnails, 8],
        [thumbnails, 100],
        [[], 5],
        [[{ time: 3, src: 'only.png' }], 100],
      ],
    },
    {
      export: 'formatFrameNumber',
      calls: [[0], [42], [12.4], [12.6], [-5], [NaN]],
    },
  ],
}
