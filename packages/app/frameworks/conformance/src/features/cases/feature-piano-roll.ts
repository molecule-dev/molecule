/**
 * `@molecule/app-feature-piano-roll-react` cases: the piano keyboard column,
 * the time grid, the cell cursor, the note rectangles, the pointer gestures
 * that move / resize / delete them, the keyboard paint path, every snap
 * variant, and the pure geometry helpers plus the four exported constants.
 *
 * `PianoRoll` mints each painted note's id from `Date.now()` and
 * `Math.random()`, so two frameworks' ids could never match on their own. The
 * kit pins `Math.random` in every case, and each painting case pins `Date.now()`
 * with `now`, so the id is identical in React's reference recording and in
 * every port.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The instant every painting case pins `Date.now()` to (2026-05-13T12:00:00Z). */
const NOW = Date.UTC(2026, 4, 13, 12, 0, 0)

/** The two notes most cases render: one with a velocity, one without. */
const notes = [
  { id: 'n1', pitch: 60, startBeat: 0, durationBeats: 1, velocity: 100 },
  { id: 'n2', pitch: 62, startBeat: 2, durationBeats: 0.5 },
]

/** One note, so a gesture case can assert a single block. */
const oneNote = [{ id: 'm1', pitch: 60, startBeat: 0, durationBeats: 1 }]

/** The grid surface's selector. */
const GRID = '[data-mol-id="piano-roll-grid"]'

/**
 * The selector of one note's element.
 *
 * @param id - The note id.
 * @returns The CSS selector.
 */
const noteSelector = (id: string): string => `[data-mol-id="piano-roll-note"][data-note-id="${id}"]`

/**
 * The selector of one note's right-edge resize handle.
 *
 * @param id - The note id.
 * @returns The CSS selector.
 */
const handleSelector = (id: string): string =>
  `[data-mol-id="piano-roll-note"][data-note-id="${id}"] [data-mol-id="piano-roll-note-handle"]`

/** The layout jsdom gives no box for: a 16-beat, 20 px/beat grid over a 12-row keyboard. */
const GRID_LAYOUT = [{ selector: GRID, rect: { width: 1280, height: 240 } }]

/** Every callback the component accepts, so gesture cases record its calls. */
const callbacks = ['onNoteAdd', 'onNoteMove', 'onNoteResize', 'onNoteDelete']

/** `@molecule/app-feature-piano-roll-react`. */
export const featurePianoRollFeature: FeatureCases = {
  package: '@molecule/app-feature-piano-roll-react',
  values: [
    { export: 'PIANO_KEYS_WIDTH_PX' },
    { export: 'MIN_NOTE_DURATION_BEATS' },
    { export: 'DRAG_DISTANCE_THRESHOLD_PX' },
    { export: 'DEFAULT_NOTE_VELOCITY' },
    {
      export: 'snapToBeats',
      calls: [['1/16'], ['1/8'], ['1/4'], ['1/2'], ['1'], ['1/32']],
    },
    {
      export: 'snapBeat',
      calls: [
        [0.7, '1/4'],
        [1.2, '1/4'],
        [0.4, '1/16'],
        [-1, '1/4'],
        [NaN, '1/4'],
        [Infinity, '1/4'],
        [-Infinity, '1/8'],
        [2.999, '1/2'],
        [5, '1'],
        [0.125, '1/8'],
      ],
    },
    {
      export: 'snapBeatRound',
      calls: [
        [0.74, '1/4'],
        [0.49, '1/4'],
        [0.4, '1/16'],
        [0.1, '1/16'],
        [-1, '1/4'],
        [NaN, '1/8'],
        [0.26, '1/16'],
        [3, '1/2'],
        [7, '1'],
      ],
    },
    {
      export: 'pixelsToBeats',
      calls: [
        [160, 80],
        [80, 0],
        [80, -10],
        [-40, 80],
        [7.5, 2.5],
        [0, 80],
      ],
    },
    {
      export: 'beatsToPixels',
      calls: [
        [2, 80],
        [2, 0],
        [2, -5],
        [-1, 80],
        [1.234, 40],
        [0, 80],
      ],
    },
    {
      export: 'yToPitch',
      calls: [
        [0, 20, 108, 21],
        [20, 20, 108, 21],
        [40, 20, 108, 21],
        [-100, 20, 108, 21],
        [100000, 20, 108, 21],
        [19.9, 20, 108, 21],
        [10, 0, 108, 21],
        [10, -5, 60, 40],
      ],
    },
    {
      export: 'pitchToY',
      calls: [
        [108, 20, 108],
        [60, 20, 108],
        [0, 20, 108],
        [127, 0, 108],
        [-5, 20, 108],
      ],
    },
    {
      export: 'isBlackKey',
      calls: [[60], [61], [63], [65], [66], [0], [-1], [127], [128], [-61]],
    },
    {
      export: 'pitchLabel',
      calls: [[60], [69], [0], [127], [61], [-1], [21], [108]],
    },
  ],
  families: [
    {
      component: 'PianoRoll',
      keyedLists: [
        {
          prop: 'notes',
          selector: '[data-mol-id="piano-roll-note"]',
          caseName: 'defaults',
        },
      ],
      cases: [
        // The family's first case also derives the locale-switch case, so it
        // renders every translated aria label (region, keys, grid, the grid's
        // keyboard help, notes).
        { name: 'defaults', props: { notes } },
        { name: 'empty notes', props: { notes: [] } },
        {
          name: 'custom range, row height and scale',
          props: {
            notes,
            lowestPitch: 48,
            highestPitch: 72,
            noteHeight: 12,
            pixelsPerBeat: 40,
          },
        },
        // `safeHighest`/`safeLowest` normalize an inverted range.
        { name: 'inverted pitch range', props: { notes, lowestPitch: 72, highestPitch: 48 } },
        {
          name: 'single pitch row',
          props: {
            notes: [{ id: 'c', pitch: 60, startBeat: 0, durationBeats: 2 }],
            lowestPitch: 60,
            highestPitch: 60,
          },
        },
        // Every snap variant (the default `1/16` renders in `defaults`).
        { name: 'snap eighth', props: { notes, snap: '1/8', beatsCount: 8 } },
        { name: 'snap quarter', props: { notes, snap: '1/4', beatsCount: 8 } },
        { name: 'snap half', props: { notes, snap: '1/2', beatsCount: 8 } },
        { name: 'snap whole', props: { notes, snap: '1', beatsCount: 8 } },
        // `beatsCount` is used as-is when given (0 is not "absent").
        { name: 'zero beats count', props: { notes: [], beatsCount: 0 } },
        // A fractional count truncates the gridline list (`Array.from` length).
        { name: 'fractional beats count', props: { notes: [], beatsCount: 2.5 } },
        { name: 'className passthrough', props: { notes, className: 'parity-token' } },
        // Velocity drives opacity, clamped into `0..127`; absent means the default.
        {
          name: 'note velocity variants',
          props: {
            notes: [
              { id: 'v0', pitch: 60, startBeat: 0, durationBeats: 1, velocity: 0 },
              { id: 'v127', pitch: 62, startBeat: 1, durationBeats: 1, velocity: 127 },
              { id: 'v42', pitch: 64, startBeat: 2, durationBeats: 1, velocity: 42 },
              { id: 'vdef', pitch: 65, startBeat: 3, durationBeats: 1 },
              { id: 'vhi', pitch: 67, startBeat: 4, durationBeats: 1, velocity: 200 },
              { id: 'vlo', pitch: 69, startBeat: 5, durationBeats: 1, velocity: -5 },
            ],
          },
        },
        // Fractional, zero-length and negative starts: the minimum width and the
        // unclamped pixel offsets.
        {
          name: 'fractional and negative note geometry',
          props: {
            notes: [
              { id: 'f', pitch: 64, startBeat: 1.234, durationBeats: 0.5 },
              { id: 'z', pitch: 65, startBeat: 0, durationBeats: 0 },
              { id: 'neg', pitch: 66, startBeat: -2, durationBeats: 1 },
            ],
          },
        },
        // A click on the empty grid paints a snapped note and moves the cursor.
        {
          name: 'a click paints a snapped note',
          props: {
            notes: [],
            lowestPitch: 60,
            highestPitch: 71,
            pixelsPerBeat: 80,
            noteHeight: 20,
          },
          callbacks,
          now: NOW,
          layout: GRID_LAYOUT,
          interactions: [
            { type: 'focus', selector: GRID },
            { type: 'click', selector: GRID },
          ],
        },
        // Without `onNoteAdd` the click is inert and no cursor renders.
        {
          name: 'a click without onNoteAdd is inert',
          props: { notes: [], lowestPitch: 60, highestPitch: 71 },
          layout: GRID_LAYOUT,
          interactions: [
            { type: 'focus', selector: GRID },
            { type: 'click', selector: GRID },
          ],
        },
        // Enter paints at the home cell cursor (beat 0, top-most pitch).
        {
          name: 'Enter paints at the home cursor',
          props: { notes: [], lowestPitch: 60, highestPitch: 71 },
          callbacks,
          now: NOW,
          interactions: [
            { type: 'focus', selector: GRID },
            { type: 'keydown', selector: GRID, key: 'Enter' },
            { type: 'keydown', selector: GRID, key: 'Enter' },
          ],
        },
        // Arrow keys move the cell cursor; Space paints at it.
        {
          name: 'arrow keys move the cursor and Space paints',
          props: { notes: [], lowestPitch: 60, highestPitch: 71 },
          callbacks,
          now: NOW,
          interactions: [
            { type: 'focus', selector: GRID },
            { type: 'keydown', selector: GRID, key: 'ArrowDown' },
            { type: 'keydown', selector: GRID, key: 'ArrowRight' },
            { type: 'keydown', selector: GRID, key: ' ' },
          ],
        },
        // Left / Up / Down from the edges clamp to the visible bounds.
        {
          name: 'the cursor clamps to the pitch range',
          props: { notes: [], lowestPitch: 60, highestPitch: 71 },
          callbacks,
          now: NOW,
          interactions: [
            { type: 'focus', selector: GRID },
            { type: 'keydown', selector: GRID, key: 'ArrowLeft' },
            { type: 'keydown', selector: GRID, key: 'ArrowUp' },
            { type: 'keydown', selector: GRID, key: 'ArrowDown' },
            { type: 'keydown', selector: GRID, key: 'ArrowDown' },
            { type: 'keydown', selector: GRID, key: 'Enter' },
          ],
        },
        // The cursor also clamps to the grid's length.
        {
          name: 'the cursor clamps to the grid length',
          props: { notes: [], lowestPitch: 60, highestPitch: 71, snap: '1', beatsCount: 1 },
          callbacks,
          now: NOW,
          interactions: [
            { type: 'focus', selector: GRID },
            { type: 'keydown', selector: GRID, key: 'ArrowRight' },
            { type: 'keydown', selector: GRID, key: 'ArrowRight' },
            { type: 'keydown', selector: GRID, key: 'Enter' },
          ],
        },
        // Painting takes the snap step as the new note's duration.
        {
          name: 'painting uses the snap step as the duration',
          props: { notes: [], lowestPitch: 60, highestPitch: 71, snap: '1/2' },
          callbacks,
          now: NOW,
          interactions: [
            { type: 'focus', selector: GRID },
            { type: 'keydown', selector: GRID, key: 'Enter' },
          ],
        },
        // A click moves the keyboard cursor, so the keyboard path continues there.
        {
          name: 'a click moves the keyboard cursor',
          props: {
            notes: [],
            lowestPitch: 60,
            highestPitch: 71,
            pixelsPerBeat: 80,
            noteHeight: 20,
          },
          callbacks,
          now: NOW,
          layout: GRID_LAYOUT,
          interactions: [
            { type: 'focus', selector: GRID },
            { type: 'keydown', selector: GRID, key: 'ArrowDown' },
            { type: 'click', selector: GRID },
            { type: 'keydown', selector: GRID, key: 'Enter' },
          ],
        },
        // Keys are inert without `onNoteAdd` (the grid stays focusable).
        {
          name: 'keys without onNoteAdd are inert',
          props: { notes: [], lowestPitch: 60, highestPitch: 71 },
          interactions: [
            { type: 'focus', selector: GRID },
            { type: 'keydown', selector: GRID, key: 'ArrowRight' },
            { type: 'keydown', selector: GRID, key: 'Enter' },
          ],
        },
        // A drag past the threshold moves the note (snapped on both axes).
        {
          name: 'dragging a note moves it',
          props: { notes: oneNote, pixelsPerBeat: 80, noteHeight: 20, snap: '1/4' },
          callbacks,
          interactions: [
            { type: 'pointer', selector: noteSelector('m1'), event: 'pointerdown', clientX: 0 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 80 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 80 },
          ],
        },
        // Dragging down one row lowers the pitch by one.
        {
          name: 'dragging down one row changes the pitch',
          props: { notes: oneNote, pixelsPerBeat: 80, noteHeight: 20, snap: '1/4' },
          callbacks,
          interactions: [
            { type: 'pointer', selector: noteSelector('m1'), event: 'pointerdown', clientX: 0 },
            {
              type: 'pointer',
              selector: 'window',
              event: 'pointermove',
              clientX: 0,
              clientY: 20,
            },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 0, clientY: 20 },
          ],
        },
        // Both axes snap in one gesture.
        {
          name: 'dragging both axes snaps both',
          props: { notes: oneNote, pixelsPerBeat: 80, noteHeight: 20, snap: '1/8' },
          callbacks,
          interactions: [
            { type: 'pointer', selector: noteSelector('m1'), event: 'pointerdown', clientX: 0 },
            {
              type: 'pointer',
              selector: 'window',
              event: 'pointermove',
              clientX: 90,
              clientY: 40,
            },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 90, clientY: 40 },
          ],
        },
        // Under the distance threshold the press never becomes a drag.
        {
          name: 'a move below the threshold does nothing',
          props: { notes: oneNote, pixelsPerBeat: 80, noteHeight: 20, snap: '1/4' },
          callbacks,
          interactions: [
            { type: 'pointer', selector: noteSelector('m1'), event: 'pointerdown', clientX: 0 },
            {
              type: 'pointer',
              selector: 'window',
              event: 'pointermove',
              clientX: 2,
              clientY: 2,
            },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 2, clientY: 2 },
          ],
        },
        // A vertical drag beyond the range clamps to the highest and lowest pitch.
        {
          name: 'dragging clamps the pitch to the range',
          props: { notes: oneNote, pixelsPerBeat: 80, noteHeight: 20, snap: '1/4' },
          callbacks,
          interactions: [
            { type: 'pointer', selector: noteSelector('m1'), event: 'pointerdown', clientX: 0 },
            {
              type: 'pointer',
              selector: 'window',
              event: 'pointermove',
              clientX: 0,
              clientY: 1000,
            },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 0, clientY: 1000 },
            { type: 'pointer', selector: noteSelector('m1'), event: 'pointerdown', clientX: 0 },
            {
              type: 'pointer',
              selector: 'window',
              event: 'pointermove',
              clientX: 0,
              clientY: -1000,
            },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 0, clientY: -1000 },
          ],
        },
        // The right-edge handle resizes instead of moving the note.
        {
          name: 'the right-edge handle resizes the note',
          props: { notes: oneNote, pixelsPerBeat: 80, noteHeight: 20, snap: '1/4' },
          callbacks,
          interactions: [
            { type: 'pointer', selector: handleSelector('m1'), event: 'pointerdown', clientX: 200 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 280 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 280 },
          ],
        },
        // Resizing below the minimum duration clamps to it.
        {
          name: 'resizing clamps at the minimum duration',
          props: { notes: oneNote, pixelsPerBeat: 80, noteHeight: 20, snap: '1/4' },
          callbacks,
          interactions: [
            { type: 'pointer', selector: handleSelector('m1'), event: 'pointerdown', clientX: 200 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 0 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 0 },
          ],
        },
        // A cancel ends the gesture as a release does.
        {
          name: 'pointercancel ends the drag',
          props: { notes: oneNote, pixelsPerBeat: 80, noteHeight: 20, snap: '1/4' },
          callbacks,
          interactions: [
            { type: 'pointer', selector: noteSelector('m1'), event: 'pointerdown', clientX: 0 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 80 },
            { type: 'pointer', selector: 'window', event: 'pointercancel', clientX: 80 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 160 },
          ],
        },
        // Moves and releases with no press behind them are inert.
        {
          name: 'a release without a press is inert',
          props: { notes: oneNote, pixelsPerBeat: 80, noteHeight: 20, snap: '1/4' },
          callbacks,
          interactions: [
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 80 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 80 },
            { type: 'pointer', selector: 'window', event: 'pointercancel' },
          ],
        },
        // The gesture reads the scale in effect when the pointer moves.
        {
          name: 'the scale changes mid-gesture',
          props: { notes: oneNote, pixelsPerBeat: 80, noteHeight: 20, snap: '1/4' },
          callbacks,
          interactions: [
            { type: 'pointer', selector: noteSelector('m1'), event: 'pointerdown', clientX: 0 },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 80 },
            { type: 'props', props: { pixelsPerBeat: 40 } },
            { type: 'pointer', selector: 'window', event: 'pointermove', clientX: 160 },
            { type: 'pointer', selector: 'window', event: 'pointerup', clientX: 160 },
          ],
        },
        // A right-click deletes the note.
        {
          name: 'right-clicking a note deletes it',
          props: { notes: [{ id: 'd1', pitch: 60, startBeat: 0, durationBeats: 1 }] },
          callbacks,
          interactions: [
            {
              type: 'event',
              selector: noteSelector('d1'),
              event: 'contextmenu',
              bubbles: true,
            },
          ],
        },
        // Without `onNoteDelete` the right-click is inert.
        {
          name: 'right-click without onNoteDelete is inert',
          props: { notes: [{ id: 'd1', pitch: 60, startBeat: 0, durationBeats: 1 }] },
          interactions: [
            {
              type: 'event',
              selector: noteSelector('d1'),
              event: 'contextmenu',
              bubbles: true,
            },
          ],
        },
        // Notes re-passed from the parent re-render in place.
        {
          name: 'notes change from the parent',
          props: { notes },
          interactions: [
            {
              type: 'props',
              props: {
                notes: [
                  { id: 'n2', pitch: 62, startBeat: 5, durationBeats: 1, velocity: 40 },
                  { id: 'n4', pitch: 67, startBeat: 9, durationBeats: 2 },
                ],
              },
            },
            { type: 'props', props: { notes: [] } },
          ],
        },
        // The scale, snap, range, length and class all change from the parent.
        {
          name: 'the scale changes from the parent',
          props: { notes, pixelsPerBeat: 80 },
          interactions: [
            { type: 'props', props: { pixelsPerBeat: 40 } },
            { type: 'props', props: { pixelsPerBeat: 0 } },
            { type: 'props', props: { pixelsPerBeat: -10 } },
          ],
        },
        {
          name: 'snap, range and row height change from the parent',
          props: { notes, snap: '1/8', lowestPitch: 48, highestPitch: 72, noteHeight: 20 },
          interactions: [
            { type: 'props', props: { snap: '1', lowestPitch: 60, highestPitch: 66 } },
            { type: 'props', props: { noteHeight: 0 } },
            { type: 'props', props: { noteHeight: 32, snap: undefined } },
          ],
        },
        {
          name: 'className and beatsCount change from the parent',
          props: { notes, className: 'parity-token', beatsCount: 16 },
          interactions: [
            { type: 'props', props: { beatsCount: 32, className: 'other-token' } },
            { type: 'props', props: { beatsCount: undefined, className: undefined } },
          ],
        },
        // A handler added after mount starts firing (and needs the pinned clock).
        {
          name: 'a handler added after mount starts firing',
          props: { notes: [], lowestPitch: 60, highestPitch: 71 },
          callbacks: ['onNoteMove'],
          now: NOW,
          layout: GRID_LAYOUT,
          interactions: [
            { type: 'props', props: { onNoteAdd: { $callback: 'onNoteAdd' } } },
            { type: 'focus', selector: GRID },
            { type: 'click', selector: GRID },
          ],
        },
        // A handler removed after mount stops firing.
        {
          name: 'a handler removed after mount stops firing',
          props: {
            notes: [],
            lowestPitch: 60,
            highestPitch: 71,
            onNoteAdd: { $callback: 'onNoteAdd' },
          },
          now: NOW,
          layout: GRID_LAYOUT,
          interactions: [
            { type: 'props', props: { onNoteAdd: undefined } },
            { type: 'focus', selector: GRID },
            { type: 'click', selector: GRID },
            { type: 'keydown', selector: GRID, key: 'Enter' },
          ],
        },
        // Every visible string comes from `t()`: a locale switch re-renders it.
        {
          name: 'a locale switch re-renders the labels',
          props: {
            notes,
            lowestPitch: 60,
            highestPitch: 71,
            onNoteAdd: { $callback: 'onNoteAdd' },
          },
          now: NOW,
          context: {
            translations: {
              de: {
                pianoRoll: {
                  aria: {
                    roll: 'Klavierrolle',
                    keys: 'Klaviertasten',
                    grid: 'Notenraster',
                    gridHelp:
                      'Die Pfeiltasten bewegen den Zellcursor, Enter oder die Leertaste zeichnet dort eine Note.',
                    resize: 'Note skalieren',
                    cursor: 'Cursor auf {{pitch}} bei Beat {{beat}}',
                    note: 'Note {{pitch}} ab Beat {{startBeat}} für {{durationBeats}} Beats',
                  },
                },
              },
            },
          },
          interactions: [
            { type: 'focus', selector: GRID },
            { type: 'locale', locale: 'de' },
            { type: 'locale', locale: 'en' },
          ],
        },
      ],
    },
  ],
}
