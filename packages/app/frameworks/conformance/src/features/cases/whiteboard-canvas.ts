/**
 * `@molecule/app-whiteboard-canvas-react` cases: the whiteboard surface
 * (`WhiteboardCanvas` — the tool layer, the SVG element overlay, the sticky
 * notes, and every tool gesture) plus the pure geometry helpers
 * (`buildStrokePath`, `buildShapePath`, `shapeBounds`, `applyEraserStrokes`,
 * `strokeIntersectsPath`, `segmentsIntersect`, the default style helpers and
 * `generateWhiteboardId`).
 *
 * `WhiteboardChange`, `WhiteboardCanvasProps` and the element types are types.
 * No case shows time, so no case pins `now`; the kit derives a locale switch
 * from the first case (the translated aria label) and the keyed-list cases from
 * `keyedLists`.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The surface's own element (the pan/zoom base's root). */
const SURFACE = '[data-mol-id="canvas-surface"]'
/** The tool layer every gesture lands on. */
const TOOL_LAYER = '[data-mol-id="whiteboard-canvas-tool-layer"]'

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

/** A full drag: press at `from`, move through `mid`, release at `to`. */
const drag = (
  from: { x: number; y: number },
  mid: { x: number; y: number },
  to: { x: number; y: number },
): ReturnType<typeof pointer>[] => [
  pointer(TOOL_LAYER, 'pointerdown', from.x, from.y),
  pointer(TOOL_LAYER, 'pointermove', mid.x, mid.y),
  pointer(TOOL_LAYER, 'pointerup', to.x, to.y),
]

/** A canvas-space point. */
const point = (x: number, y: number): { x: number; y: number } => ({ x, y })

/** A committed free-form stroke. */
const stroke = (
  id: string,
  kind: 'pen' | 'marker' | 'eraser',
  points: Record<string, number>[],
): Record<string, unknown> => ({
  id,
  kind,
  points,
  color:
    kind === 'pen'
      ? '#111827'
      : kind === 'marker'
        ? 'rgba(250, 204, 21, 0.55)'
        : 'rgba(255, 255, 255, 0.6)',
  width: kind === 'pen' ? 2 : kind === 'marker' ? 14 : 24,
})

/** A committed vector shape. */
const shape = (
  id: string,
  kind: 'line' | 'arrow' | 'rect' | 'ellipse',
  from: Record<string, number>,
  to: Record<string, number>,
  fill?: string,
): Record<string, unknown> => ({
  id,
  kind,
  from,
  to,
  stroke: '#334155',
  strokeWidth: 3,
  ...(fill === undefined ? {} : { fill }),
})

/** A committed sticky note / text box. */
const note = (id: string, text: string): Record<string, unknown> => ({
  id,
  position: point(30, 30),
  width: 100,
  height: 80,
  text,
  background: '#fef08a',
  color: '#1f2937',
})

/** One element of every kind, so a case renders every overlay branch. */
const everyElement = {
  strokes: [
    stroke('s-pen', 'pen', [point(0, 0), point(20, 10)]),
    stroke('s-marker', 'marker', [point(40, 0), point(60, 10)]),
    stroke('s-eraser', 'eraser', [point(80, 0), point(100, 10)]),
  ],
  shapes: [
    shape('sh-line', 'line', point(0, 40), point(60, 70)),
    shape('sh-arrow', 'arrow', point(0, 100), point(40, 140)),
    shape('sh-rect', 'rect', point(5, 160), point(45, 200), '#dbeafe'),
    shape('sh-rect-plain', 'rect', point(50, 160), point(90, 200)),
    shape('sh-ellipse', 'ellipse', point(100, 160), point(140, 200), 'rgba(255, 255, 255, 0.0)'),
  ],
  stickyNotes: [note('st-note', 'Ideas')],
}

/** The shared props of a gesture case (an empty board for the gesture to land on). */
const board = {
  strokes: [],
  shapes: [],
  stickyNotes: [],
  width: 400,
  height: 300,
}

/** `@molecule/app-whiteboard-canvas-react`. */
export const whiteboardCanvasFeature: FeatureCases = {
  package: '@molecule/app-whiteboard-canvas-react',
  families: [
    {
      component: 'WhiteboardCanvas',
      cases: [
        {
          name: 'an empty board',
          props: { ...board, tool: 'pen' },
          callbacks: ['onChange'],
        },
        {
          name: 'every committed element renders',
          props: { ...board, ...everyElement, tool: 'pen' },
          callbacks: ['onChange'],
        },
        {
          name: 'classes, a label override and another size',
          props: {
            ...board,
            tool: 'pen',
            className: 'parity-token',
            ariaLabel: 'Board',
            width: 320,
            height: 240,
          },
          callbacks: ['onChange'],
        },
        {
          name: 'an initial viewport maps gestures into canvas space',
          props: { ...board, tool: 'pen', initialViewport: { x: 40, y: -20, zoom: 2 } },
          callbacks: ['onChange'],
          interactions: drag(point(100, 100), point(140, 100), point(140, 100)),
        },
        {
          name: 'viewport limits clamp a background pan',
          props: {
            ...board,
            tool: 'select',
            viewportLimits: { bounds: { x: 0, y: 0, width: 200, height: 200 } },
          },
          callbacks: ['onChange'],
          interactions: [
            pointer(SURFACE, 'pointerdown', 100, 100),
            pointer(SURFACE, 'pointermove', 130, 150),
            pointer(SURFACE, 'pointermove', 130, 150),
            pointer(SURFACE, 'pointerup', 130, 150),
          ],
        },
        {
          name: 'a pen stroke commits on pointer up',
          props: { ...board, tool: 'pen' },
          callbacks: ['onChange'],
          interactions: [
            pointer(TOOL_LAYER, 'pointerdown', 100, 100),
            pointer(TOOL_LAYER, 'pointermove', 110, 120),
            pointer(TOOL_LAYER, 'pointermove', 130, 140),
            pointer(TOOL_LAYER, 'pointerup', 130, 140),
          ],
        },
        {
          name: 'a marker stroke uses the marker defaults',
          props: { ...board, tool: 'marker' },
          callbacks: ['onChange'],
          interactions: drag(point(0, 0), point(30, 40), point(30, 40)),
        },
        {
          name: 'an eraser stroke commits at its halo defaults',
          props: { ...board, tool: 'eraser' },
          callbacks: ['onChange'],
          interactions: drag(point(50, 50), point(60, 50), point(60, 50)),
        },
        {
          name: 'stroke overrides reach a stroke',
          props: { ...board, tool: 'pen', strokeColor: '#ff0000', strokeWidth: 5 },
          callbacks: ['onChange'],
          interactions: drag(point(10, 10), point(50, 30), point(50, 30)),
        },
        {
          name: 'stroke overrides reach a shape',
          props: { ...board, tool: 'line', strokeColor: '#0ea5e9', strokeWidth: 6 },
          callbacks: ['onChange'],
          interactions: drag(point(10, 10), point(80, 60), point(80, 60)),
        },
        {
          name: 'a line commits from a drag',
          props: { ...board, tool: 'line' },
          callbacks: ['onChange'],
          interactions: drag(point(10, 10), point(50, 40), point(80, 60)),
        },
        {
          name: 'an arrow commits with its barbs',
          props: { ...board, tool: 'arrow' },
          callbacks: ['onChange'],
          interactions: drag(point(0, 0), point(60, 30), point(100, 50)),
        },
        {
          name: 'a rect commits with its default fill',
          props: { ...board, tool: 'rect' },
          callbacks: ['onChange'],
          interactions: drag(point(20, 20), point(70, 60), point(120, 90)),
        },
        {
          name: 'an ellipse commits with its default fill',
          props: { ...board, tool: 'ellipse' },
          callbacks: ['onChange'],
          interactions: drag(point(10, 10), point(40, 30), point(70, 50)),
        },
        {
          name: 'a click without a drag commits no shape',
          props: { ...board, tool: 'rect' },
          callbacks: ['onChange'],
          interactions: [
            pointer(TOOL_LAYER, 'pointerdown', 50, 50),
            pointer(TOOL_LAYER, 'pointerup', 50, 50),
          ],
        },
        {
          name: 'a sticky note places centered under the pointer',
          props: { ...board, tool: 'sticky' },
          callbacks: ['onChange'],
          interactions: [pointer(TOOL_LAYER, 'pointerdown', 200, 200)],
        },
        {
          name: 'the text tool places a transparent text box',
          props: { ...board, tool: 'text' },
          callbacks: ['onChange'],
          interactions: [pointer(TOOL_LAYER, 'pointerdown', 150, 150)],
        },
        {
          name: 'a sticky background override reaches the note',
          props: { ...board, tool: 'sticky', stickyBackground: '#aabbcc' },
          callbacks: ['onChange'],
          interactions: [pointer(TOOL_LAYER, 'pointerdown', 150, 150)],
        },
        {
          name: 'the select tool draws nothing',
          props: { ...board, tool: 'select' },
          callbacks: ['onChange'],
          interactions: drag(point(10, 10), point(50, 50), point(50, 50)),
        },
        {
          name: 'readOnly disables every tool but keeps the background pan',
          props: {
            ...board,
            tool: 'pen',
            readOnly: true,
            strokes: [stroke('kept', 'pen', [point(0, 0), point(10, 10)])],
          },
          callbacks: ['onChange'],
          interactions: [
            ...drag(point(50, 50), point(80, 80), point(80, 80)),
            pointer(SURFACE, 'pointerdown', 100, 100),
            pointer(SURFACE, 'pointermove', 120, 120),
            pointer(SURFACE, 'pointermove', 120, 120),
            pointer(SURFACE, 'pointerup', 120, 120),
          ],
        },
        {
          name: 'a cancelled pointer commits the in-flight stroke',
          props: { ...board, tool: 'pen' },
          callbacks: ['onChange'],
          interactions: [
            pointer(TOOL_LAYER, 'pointerdown', 10, 10),
            pointer(TOOL_LAYER, 'pointermove', 20, 10),
            pointer(TOOL_LAYER, 'pointercancel', 20, 10),
          ],
        },
        {
          name: 'a tool change keeps the in-flight stroke',
          props: { ...board, tool: 'pen' },
          callbacks: ['onChange'],
          interactions: [
            pointer(TOOL_LAYER, 'pointerdown', 10, 10),
            { type: 'props', props: { tool: 'marker' } },
            pointer(TOOL_LAYER, 'pointermove', 30, 10),
            pointer(TOOL_LAYER, 'pointerup', 30, 10),
          ],
        },
        {
          name: 'later props replace the board contents',
          props: {
            ...board,
            tool: 'pen',
            strokes: [stroke('a', 'pen', [point(0, 0), point(10, 0)])],
          },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'props',
              props: {
                strokes: [
                  stroke('a', 'pen', [point(0, 0), point(10, 0)]),
                  stroke('b', 'marker', [point(20, 0), point(30, 0)]),
                ],
              },
            },
            {
              type: 'props',
              props: { strokes: [], shapes: [shape('c', 'rect', point(0, 0), point(30, 20))] },
            },
          ],
        },
        {
          name: 'a later initial viewport keeps the viewport',
          props: { ...board, tool: 'pen', initialViewport: { x: 5, y: 5, zoom: 1 } },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { initialViewport: { x: 99, y: 99, zoom: 3 } } }],
        },
        {
          name: 'width and height changes resize the surface',
          props: { ...board, tool: 'pen' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { width: 300, height: 200 } },
            { type: 'props', props: { width: 150, height: 100 } },
          ],
        },
        {
          name: 'readOnly follows a props change',
          props: { ...board, tool: 'pen', readOnly: true },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { readOnly: false } },
            ...drag(point(20, 20), point(40, 40), point(40, 40)),
          ],
        },
      ],
      keyedLists: [
        {
          prop: 'strokes',
          selector: '[data-mol-id="whiteboard-canvas-stroke"]',
          caseName: 'every committed element renders',
        },
      ],
    },
  ],
  values: [
    {
      export: 'generateWhiteboardId',
      calls: [[], [], []],
    },
    {
      export: 'buildStrokePath',
      calls: [
        [[]],
        [[point(1, 2)]],
        [[point(0, 0), point(10, 10)]],
        [[point(0, 0), point(10, 0), point(20, 10)]],
        [[point(0, 0), point(10, 0), point(20, 10), point(30, 0)]],
      ],
    },
    {
      export: 'defaultStrokeWidth',
      calls: [['pen'], ['marker'], ['eraser']],
    },
    {
      export: 'defaultStrokeColor',
      calls: [['pen'], ['marker'], ['eraser']],
    },
    {
      export: 'shapeBounds',
      calls: [
        [shape('a', 'rect', point(100, 100), point(50, 70))],
        [shape('a', 'line', point(0, 0), point(10, 10))],
        [shape('a', 'ellipse', point(-10, -20), point(10, 20))],
      ],
    },
    {
      export: 'buildShapePath',
      calls: [
        [shape('a', 'line', point(0, 0), point(10, 10))],
        [shape('a', 'arrow', point(0, 0), point(10, 10))],
        [shape('a', 'arrow', point(100, 100), point(0, 0))],
        [shape('a', 'rect', point(0, 0), point(10, 10))],
        [shape('a', 'rect', point(5, 5), point(-5, 25))],
        [shape('a', 'ellipse', point(0, 0), point(10, 10))],
        [shape('a', 'ellipse', point(0, 0), point(0, 0))],
      ],
    },
    {
      export: 'defaultShapeStyle',
      calls: [['line'], ['arrow'], ['rect'], ['ellipse']],
    },
    {
      export: 'defaultStickyNoteStyle',
      calls: [[]],
    },
    {
      export: 'segmentsIntersect',
      calls: [
        [point(0, 0), point(10, 10), point(0, 10), point(10, 0)],
        [point(0, 0), point(10, 0), point(0, 5), point(10, 5)],
        [point(0, 0), point(10, 0), point(5, 0), point(15, 0)],
        [point(0, 0), point(10, 0), point(15, 0), point(20, 0)],
        [point(0, 0), point(0, 10), point(-5, 5), point(5, 5)],
      ],
    },
    {
      export: 'strokeIntersectsPath',
      calls: [
        [
          stroke('e', 'eraser', [point(50, -10), point(50, 10)]),
          stroke('t', 'pen', [point(0, 0), point(100, 0)]),
        ],
        [
          stroke('e', 'eraser', [point(200, 200), point(210, 210)]),
          stroke('t', 'pen', [point(0, 0), point(100, 0)]),
        ],
        [
          stroke('p', 'pen', [point(0, 0), point(10, 10)]),
          stroke('t', 'pen', [point(0, 10), point(10, 0)]),
        ],
        [stroke('e', 'eraser', [point(0, 0)]), stroke('t', 'pen', [point(0, 0), point(10, 10)])],
      ],
    },
    {
      export: 'applyEraserStrokes',
      calls: [
        [[]],
        [
          [
            stroke('pen-1', 'pen', [point(0, 0), point(100, 0)]),
            stroke('pen-2', 'pen', [point(0, 50), point(100, 50)]),
            stroke('eraser-1', 'eraser', [point(50, -10), point(50, 10)]),
          ],
        ],
        [
          [
            stroke('pen-1', 'pen', [point(0, 0), point(100, 0)]),
            stroke('eraser-1', 'eraser', [point(200, 200), point(210, 210)]),
          ],
        ],
        [[stroke('eraser-only', 'eraser', [point(0, 0), point(10, 10)])]],
      ],
    },
  ],
}
