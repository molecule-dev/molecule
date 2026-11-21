/**
 * `@molecule/app-canvas-engine-react` cases: the vector design-tool
 * `<CanvasEngine>` (pan/zoom surface + grid + marquee + drag), the
 * presentational `<VectorElementSvg>` for every element kind, the pure
 * geometry/alignment/history helpers, and the undo/redo stack.
 *
 * The engine's grid, snap flag and surface size are visible in its DOM
 * (`data-canvas-engine-snap`, `data-canvas-engine-grid`, the SVG size and the
 * `<pattern>`), so an uncontrolled document, selection or marquee shows its
 * result in the snapshot without a callback. A controlled engine (one given
 * `onChange` / `onSelectionChange`) reports every mutation instead and keeps
 * the props it is given, so its case asserts the recorded calls.
 *
 * jsdom reports every `getBoundingClientRect()` as zeros, so a pointer step's
 * client coordinates ARE the canvas coordinates the engine derives (the
 * surface is at the origin at the identity viewport). Every framework runs the
 * same arithmetic, so the recorded geometry is equal.
 *
 * `<VectorElementSvg>` is rendered only through `<CanvasEngine>` (its only real
 * use): mounted on its own its root `<g>` sits outside an `<svg>`, where jsdom
 * has no SVG namespace and React warns about every SVG tag it draws, so its
 * markup — every element kind, style and transform — is compared inside the
 * engine's own SVG instead.
 *
 * `HistoryStack` is a mutable class rather than a plain value, so it is named
 * in `frameworkShaped`: a value check can only carry JSON data, and its
 * behaviour is pinned by the same ported unit tests in every framework.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The SVG layer that holds the grid, the elements and the marquee. */
const SVG = '[data-mol-id="canvas-engine-svg"]'
/** The pan/zoom surface the engine wraps. */
const SURFACE = '[data-mol-id="canvas-surface"]'
/** The wrapper `<g>` of the element with this id. */
const element = (id: string): string => `[data-canvas-element-id="${id}"]`

/** A rectangle layer. */
const rect = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({ id, kind: 'rect', x, y, width, height, ...extra })

/** An ellipse layer. */
const ellipse = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({ id, kind: 'ellipse', x, y, width, height, ...extra })

/** A line layer. */
const line = (
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({ id, kind: 'line', x1, y1, x2, y2, ...extra })

/** A document of the given layers, 400x300. */
const doc = (...layers: Record<string, unknown>[]): Record<string, unknown> => ({
  width: 400,
  height: 300,
  layers,
})

/** The line, the rectangle and the group a drag has to translate. */
const dragLayers = (): Record<string, unknown>[] => [
  line('line', 0, 250, 200, 290, { stroke: '#0000ff' }),
  rect('a', 0, 0, 100, 100, { fill: '#ff0000' }),
  {
    id: 'group',
    kind: 'group',
    x: 0,
    y: 0,
    width: 40,
    height: 40,
    children: [rect('g-child', 0, 0, 40, 40, { fill: '#00ff00' })],
  },
]

/** A primary-pointer step on one element. */
const pointer = (
  selector: string,
  event: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  clientX: number,
  clientY: number,
): {
  type: 'pointer'
  selector: string
  event: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel'
  clientX: number
  clientY: number
} => ({ type: 'pointer', selector, event, clientX, clientY })

/** A rectangle with every style field left out. */
const bareRect: Record<string, unknown> = {
  id: 'bare',
  kind: 'rect',
  x: 4,
  y: 6,
  width: 30,
  height: 20,
}

/** Everything the presentational renderer's style, blend and transform branches read. */
const richLayers = (): Record<string, unknown>[] => [
  rect('rect', 10, 20, 120, 80, {
    cornerRadius: 6,
    fill: '#3b82f6',
    stroke: '#111827',
    strokeWidth: 2,
    opacity: 0.8,
    blendMode: 'multiply',
    transform: { rotation: 15 },
  }),
  ellipse('ellipse', 200, 40, 90, 60, {
    fill: '#f59e0b',
    transform: { scaleX: 2, scaleY: 1 },
  }),
  line('line', 20, 300, 180, 360, {
    stroke: '#22c55e',
    strokeWidth: 3,
    transform: { rotation: -10 },
  }),
  {
    id: 'path',
    kind: 'path',
    x: 260,
    y: 220,
    width: 100,
    height: 60,
    d: 'M0 0 L50 60 L100 0 Z',
    fill: 'none',
    stroke: '#a855f7',
  },
  {
    id: 'text',
    kind: 'text',
    x: 40,
    y: 420,
    width: 160,
    height: 40,
    text: 'Label',
    fontSize: 20,
    fontFamily: 'Georgia, serif',
    fontWeight: 700,
    fill: '#0f172a',
  },
  {
    id: 'group',
    kind: 'group',
    x: 0,
    y: 0,
    width: 60,
    height: 60,
    transform: { rotation: 45 },
    children: [rect('g-rect', 0, 0, 60, 60, { fill: '#e11d48' })],
  },
]

/** The rectangles a `distributeLayers` call spreads evenly. */
const spread = [rect('a', 0, 0, 10, 10), rect('b', 30, 0, 10, 10), rect('c', 100, 0, 10, 10)]

/** A line, an ellipse and another rectangle — the marquee's candidates. */
const marqueeDoc = (): Record<string, unknown> =>
  doc(rect('a', 0, 0, 100, 100), ellipse('b', 200, 200, 80, 60), line('c', 0, 250, 200, 290))

/** `@molecule/app-canvas-engine-react`. */
export const canvasEngineFeature: FeatureCases = {
  package: '@molecule/app-canvas-engine-react',
  families: [
    {
      component: 'CanvasEngine',
      cases: [
        {
          name: 'a document at its defaults',
          props: { document: doc(rect('a', 0, 0, 100, 100, { fill: '#ff0000' })) },
        },
        { name: 'an empty document', props: { document: doc() } },
        {
          name: 'snap to grid off hides the grid and says so',
          props: {
            document: doc(rect('a', 0, 0, 100, 100)),
            snapToGrid: false,
          },
        },
        {
          name: 'a grid shown without snapping',
          props: {
            document: doc(rect('b', 10, 10, 40, 40, { fill: '#00ff00' })),
            snapToGrid: false,
            showGrid: true,
          },
        },
        {
          name: 'a grid hidden while snapping',
          props: { document: doc(rect('a', 0, 0, 100, 100)), showGrid: false },
        },
        {
          name: 'a coarse grid',
          props: {
            document: doc(ellipse('b', 200, 200, 80, 60, { fill: '#00ff00' })),
            gridSize: 20,
            width: 640,
            height: 480,
          },
        },
        {
          name: 'a surface size smaller than the document',
          props: {
            document: {
              width: 800,
              height: 600,
              layers: [rect('a', 0, 0, 100, 100)],
            },
            width: 320,
            height: 200,
          },
        },
        {
          name: 'every element kind with styles and transforms',
          props: {
            document: { width: 400, height: 560, layers: richLayers() },
          },
        },
        {
          name: 'a bare rect, a default text and a selected group',
          props: {
            document: doc(
              bareRect,
              {
                id: 't',
                kind: 'text',
                x: 10,
                y: 30,
                width: 120,
                height: 40,
                text: 'Hello',
              },
              {
                id: 'g',
                kind: 'group',
                x: 0,
                y: 0,
                width: 40,
                height: 40,
                children: [
                  rect('g1', 0, 0, 20, 20, { fill: '#ff0000' }),
                  ellipse('g2', 20, 20, 20, 20, { fill: '#00ff00' }),
                ],
              },
            ),
            selection: ['g'],
          },
          callbacks: ['onSelectionChange'],
        },
        {
          name: 'classes, an aria label and a history limit',
          props: {
            document: doc(rect('a', 0, 0, 100, 100)),
            className: 'parity-token',
            ariaLabel: 'Design board',
            historyLimit: 2,
          },
        },
        {
          name: 'a controlled selection marks the chosen layers',
          props: {
            document: marqueeDoc(),
            selection: ['a', 'c'],
          },
          callbacks: ['onSelectionChange'],
        },
        {
          name: 'a background press clears the selection and opens a marquee',
          props: {
            document: marqueeDoc(),
            selection: ['a'],
          },
          callbacks: ['onSelectionChange'],
          interactions: [
            pointer(SURFACE, 'pointerdown', 0, 0),
            pointer(SVG, 'pointermove', 150, 150),
            pointer(SVG, 'pointerup', 150, 150),
          ],
        },
        {
          name: 'an uncontrolled marquee selects the layers it reaches',
          props: { document: marqueeDoc() },
          interactions: [
            pointer(SURFACE, 'pointerdown', 0, 0),
            pointer(SVG, 'pointermove', 150, 150),
            pointer(SVG, 'pointermove', 320, 280),
          ],
        },
        {
          name: 'pressing an element selects it',
          props: { document: doc(rect('a', 0, 0, 100, 100), rect('b', 200, 0, 50, 50)) },
          callbacks: ['onSelectionChange'],
          interactions: [
            pointer(element('a'), 'pointerdown', 10, 10),
            pointer(SVG, 'pointerup', 10, 10),
          ],
        },
        {
          name: 'dragging an element snaps it to the grid',
          props: {
            document: doc(rect('a', 0, 0, 100, 100), ellipse('b', 200, 200, 80, 60)),
          },
          interactions: [
            pointer(element('a'), 'pointerdown', 10, 10),
            pointer(SVG, 'pointermove', 30, 26),
            pointer(SVG, 'pointermove', 50, 40),
            pointer(SVG, 'pointerup', 50, 40),
          ],
        },
        {
          name: 'dragging without snapping moves by the raw delta',
          props: {
            document: doc(rect('a', 0, 0, 100, 100)),
            snapToGrid: false,
          },
          interactions: [
            pointer(element('a'), 'pointerdown', 10, 10),
            pointer(SVG, 'pointermove', 30, 26),
            pointer(SVG, 'pointerup', 30, 26),
          ],
        },
        {
          name: 'a controlled drag reports each moved document',
          props: {
            document: doc(rect('a', 0, 0, 100, 100)),
            selection: ['a'],
          },
          callbacks: ['onChange', 'onSelectionChange'],
          interactions: [
            pointer(element('a'), 'pointerdown', 10, 10),
            // A move with no displacement records nothing.
            pointer(SVG, 'pointermove', 10, 10),
            pointer(SVG, 'pointermove', 26, 22),
            pointer(SVG, 'pointermove', 42, 38),
            pointer(SVG, 'pointerup', 42, 38),
          ],
        },
        {
          name: 'dragging a line and a group moves their geometry',
          props: {
            document: doc(...dragLayers()),
            selection: ['line', 'group'],
          },
          callbacks: ['onSelectionChange'],
          interactions: [
            pointer(element('line'), 'pointerdown', 0, 0),
            pointer(SVG, 'pointermove', 8, 8),
            pointer(SVG, 'pointerup', 8, 8),
          ],
        },
        {
          name: 'later props replace an uncontrolled document and the grid',
          props: {
            document: doc(rect('a', 0, 0, 100, 100)),
            gridSize: 8,
          },
          interactions: [
            { type: 'props', props: { document: doc(ellipse('b', 40, 40, 20, 20)) } },
            { type: 'props', props: { snapToGrid: false, gridSize: 16, ariaLabel: 'After' } },
            { type: 'props', props: { showGrid: true, snapToGrid: true } },
          ],
        },
        {
          name: 'a controlled document follows the prop',
          props: {
            document: doc(rect('a', 0, 0, 100, 100)),
            selection: [],
          },
          callbacks: ['onChange', 'onSelectionChange'],
          interactions: [
            { type: 'props', props: { document: doc(rect('c', 50, 50, 30, 30)) } },
            { type: 'props', props: { selection: ['c'] } },
          ],
        },
      ],
    },
  ],
  values: [
    {
      export: 'snapToGrid',
      calls: [
        [7, 8],
        [11, 8],
        [13, 8],
        [-5, 8],
        [13, 0],
        [13, -4],
      ],
    },
    {
      export: 'elementBounds',
      calls: [
        [rect('a', 10, 20, 30, 40)],
        [line('l', 5, 100, 50, 10)],
        [{ id: 'g', kind: 'group', x: 1, y: 2, width: 3, height: 4, children: [] }],
        [{ id: 't', kind: 'text', x: 0, y: 0, width: 60, height: 20, text: 'x' }],
      ],
    },
    {
      export: 'unionBounds',
      calls: [
        [
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 5, y: 8, width: 20, height: 4 },
        ],
        [
          { x: 10, y: 10, width: 5, height: 5 },
          { x: 0, y: 0, width: 5, height: 5 },
        ],
      ],
    },
    {
      export: 'combinedBounds',
      calls: [[[]], [[rect('a', 1, 2, 3, 4)]], [[...spread]]],
    },
    {
      export: 'rectsIntersect',
      calls: [
        [
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 5, y: 5, width: 20, height: 20 },
        ],
        [
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 100, y: 100, width: 5, height: 5 },
        ],
        [
          { x: 0, y: 0, width: 10, height: 10 },
          { x: 10, y: 10, width: 5, height: 5 },
        ],
      ],
    },
    {
      export: 'translateElement',
      calls: [
        [rect('a', 10, 20, 5, 5), 4, -2],
        [line('l', 0, 0, 10, 10), 5, 5],
        [
          {
            id: 'g',
            kind: 'group',
            x: 0,
            y: 0,
            width: 10,
            height: 10,
            children: [rect('a', 0, 0, 5, 5), rect('b', 5, 5, 5, 5)],
          },
          2,
          3,
        ],
      ],
    },
    {
      export: 'findElement',
      calls: [
        [[rect('a', 0, 0, 1, 1), rect('b', 0, 0, 1, 1)], 'b'],
        [[rect('a', 0, 0, 1, 1)], 'missing'],
        [[], 'a'],
      ],
    },
    {
      export: 'alignLayers',
      calls: [
        [[rect('a', 0, 0, 10, 10), rect('b', 20, 30, 10, 10)], ['a', 'b'], 'left'],
        [[rect('a', 0, 0, 10, 10), rect('b', 20, 0, 30, 10)], ['a', 'b'], 'right'],
        [[rect('a', 0, 0, 10, 10), rect('b', 100, 0, 10, 10)], ['a', 'b'], 'center'],
        [[rect('a', 0, 0, 10, 10), rect('b', 0, 50, 10, 20)], ['a', 'b'], 'top'],
        [[rect('a', 0, 0, 10, 10), rect('b', 0, 50, 10, 20)], ['a', 'b'], 'bottom'],
        [[rect('a', 0, 0, 10, 10), rect('b', 0, 50, 10, 20)], ['a', 'b'], 'middle'],
        // Fewer than two selected: the layers come back as a new slice.
        [[rect('a', 0, 0, 10, 10), rect('b', 20, 30, 10, 10)], ['a'], 'left'],
        // A line aligns by its endpoint bounding box.
        [[line('l', 5, 5, 55, 25), rect('b', 80, 0, 10, 10)], ['l', 'b'], 'left'],
      ],
    },
    {
      export: 'distributeLayers',
      calls: [
        [[...spread], ['a', 'b', 'c'], 'horizontal'],
        [[...spread], ['a', 'b', 'c'], 'vertical'],
        [[rect('a', 0, 0, 10, 10), rect('b', 50, 0, 10, 10)], ['a', 'b'], 'horizontal'],
      ],
    },
    { export: 'DEFAULT_HISTORY_LIMIT' },
  ],
  frameworkShaped: {
    VectorElementSvg:
      'a presentational renderer whose root is an SVG <g>: mounted as a case of its own it sits outside an <svg> (jsdom has no SVG namespace, and React warns that every SVG tag it draws is unrecognized), so its markup for every element kind, style and transform is compared through the <CanvasEngine> cases, which render it inside the engine’s SVG',
    HistoryStack:
      'an exported mutable class, not plain data: a value check can only carry JSON, so each framework exports its own instance type and the same ported `HistoryStack` unit tests pin its behaviour',
  },
}
