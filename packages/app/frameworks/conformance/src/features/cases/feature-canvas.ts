/**
 * `@molecule/app-feature-canvas-react` cases: the pan/zoom `<CanvasSurface>`,
 * the positioned `<CanvasNode>`, the `<CanvasEdge>` geometry, the pure
 * coordinate/edge-path helpers, and the viewport/selection hooks.
 *
 * The surface's viewport state lives on the inner layer as `data-canvas-*`
 * attributes and in its `transform`, so an uncontrolled pan or wheel zoom is
 * visible in the snapshot without a callback. A controlled surface reports
 * every update through `onViewportChange` and keeps the given viewport.
 *
 * The wheel handler reads `getBoundingClientRect()`, which jsdom reports as
 * zeros, and the kit's `event` step carries no `deltaY` — so a wheel step is
 * the zoom-OUT branch around the surface origin. Every framework runs the same
 * arithmetic, so the recorded viewport (non-finite values included) is equal.
 *
 * @module
 */

import type { NodeSpec } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** The surface's own element. */
const SURFACE = '[data-mol-id="canvas-surface"]'
/** A node without an id. */
const NO_ID_NODE = '[data-mol-id="canvas-node"]'
/** The node with id `a`. */
const NODE = '[data-mol-id="canvas-node-a"]'
/** The resize handle of node `a`. */
const HANDLE = '[data-mol-id="canvas-node-resize-handle-a"]'

/** A point in canvas-space. */
const point = (x: number, y: number): Record<string, number> => ({ x, y })

/** A size in canvas-space. */
const size = (width: number, height: number): Record<string, number> => ({ width, height })

/** A viewport. */
const viewport = (x: number, y: number, zoom: number): Record<string, number> => ({
  x,
  y,
  zoom,
})

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

/** One child the surface renders inside its canvas-space layer. */
const innerChild: NodeSpec[] = [{ tag: 'span', attrs: { 'data-child': '1' }, children: ['hello'] }]

/** `@molecule/app-feature-canvas-react`. */
export const featureCanvasFeature: FeatureCases = {
  package: '@molecule/app-feature-canvas-react',
  families: [
    {
      component: 'CanvasSurface',
      cases: [
        { name: 'a sized surface at the identity viewport', props: { width: 400, height: 300 } },
        {
          name: 'children render in the canvas-space layer',
          props: { width: 320, height: 240 },
          children: innerChild,
        },
        {
          name: 'aria label, classes and a controlled viewport',
          props: {
            width: 400,
            height: 300,
            viewport: viewport(10, 20, 2),
            ariaLabel: 'Board',
            className: 'parity-token',
          },
        },
        {
          name: 'an initial viewport transforms the inner layer',
          props: { width: 400, height: 300, initialViewport: viewport(40, -20, 1.5) },
        },
        {
          name: 'dragging the surface pans an uncontrolled viewport',
          props: { width: 400, height: 300 },
          interactions: [
            pointer(SURFACE, 'pointerdown', 100, 100),
            pointer(SURFACE, 'pointermove', 110, 120),
            pointer(SURFACE, 'pointermove', 90, 90),
            pointer(SURFACE, 'pointerup', 90, 90),
          ],
        },
        {
          name: 'a cancelled pointer ends the pan',
          props: { width: 400, height: 300 },
          interactions: [
            pointer(SURFACE, 'pointerdown', 100, 100),
            pointer(SURFACE, 'pointermove', 110, 120),
            pointer(SURFACE, 'pointercancel', 110, 120),
            pointer(SURFACE, 'pointermove', 140, 160),
          ],
        },
        {
          name: 'panOnDrag false keeps the viewport',
          props: { width: 400, height: 300, panOnDrag: false },
          interactions: [
            pointer(SURFACE, 'pointerdown', 100, 100),
            pointer(SURFACE, 'pointermove', 110, 120),
            pointer(SURFACE, 'pointerup', 110, 120),
          ],
        },
        {
          name: 'a controlled pan reports the clamped viewport',
          props: { width: 400, height: 300, viewport: viewport(0, 0, 1) },
          callbacks: ['onViewportChange'],
          interactions: [
            pointer(SURFACE, 'pointerdown', 100, 100),
            pointer(SURFACE, 'pointermove', 110, 120),
            pointer(SURFACE, 'pointerup', 110, 120),
          ],
        },
        {
          name: 'a zero zoom is treated as identity while panning',
          props: { width: 400, height: 300, viewport: viewport(0, 0, 0) },
          callbacks: ['onViewportChange'],
          interactions: [
            pointer(SURFACE, 'pointerdown', 100, 100),
            pointer(SURFACE, 'pointermove', 110, 120),
          ],
        },
        {
          name: 'limits clamp the pan origin',
          props: {
            width: 400,
            height: 300,
            limits: { bounds: { x: 0, y: 0, width: 200, height: 200 } },
          },
          interactions: [
            pointer(SURFACE, 'pointerdown', 100, 100),
            pointer(SURFACE, 'pointermove', 110, 120),
          ],
        },
        {
          name: 'an empty-area press calls onBackgroundPointerDown',
          props: { width: 400, height: 300 },
          callbacks: ['onBackgroundPointerDown'],
          interactions: [pointer(SURFACE, 'pointerdown', 5, 5)],
        },
        {
          name: 'a child press is not a background press',
          props: { width: 400, height: 300 },
          children: innerChild,
          callbacks: ['onBackgroundPointerDown'],
          interactions: [pointer('span[data-child]', 'pointerdown', 5, 5)],
        },
        {
          // The kit's wheel step carries no deltaY/clientX, so the recorded
          // viewport would be NaN and React warns about NaN attributes. A
          // negated zoom factor is the one wheel spelling that stays finite:
          // the handler runs, reads zoomFactor, and zoomBy refuses the factor.
          name: 'a wheel with a negated zoom factor leaves the viewport',
          props: { width: 400, height: 300, zoomFactor: -1 },
          interactions: [{ type: 'event', selector: SURFACE, event: 'wheel', bubbles: true }],
        },
        {
          name: 'later props update the label',
          props: { width: 400, height: 300, ariaLabel: 'Before' },
          interactions: [
            { type: 'props', props: { ariaLabel: 'After' } },
            { type: 'props', props: { ariaLabel: undefined } },
          ],
        },
        {
          name: 'a later initial viewport keeps an uncontrolled viewport',
          props: { width: 400, height: 300, initialViewport: viewport(1, 2, 1) },
          interactions: [{ type: 'props', props: { initialViewport: viewport(9, 9, 3) } }],
        },
      ],
    },
    {
      component: 'CanvasNode',
      cases: [
        { name: 'a node at a canvas position', props: { position: point(100, 50) } },
        {
          name: 'an id, a size and children',
          props: { id: 'a', position: point(10, 20), size: size(80, 40) },
          children: [{ tag: 'b', children: ['x'] }],
        },
        {
          name: 'a selected node describes itself as Selected',
          props: { id: 'a', position: point(0, 0), selected: true },
        },
        {
          name: 'aria label and classes',
          props: { id: 'a', position: point(0, 0), ariaLabel: 'Card', className: 'parity-node' },
        },
        {
          name: 'pressing without moving selects the node',
          props: { id: 'a', position: point(0, 0) },
          callbacks: ['onSelect', 'onDrag'],
          interactions: [pointer(NODE, 'pointerdown', 10, 10), pointer(NODE, 'pointerup', 10, 10)],
        },
        {
          name: 'selecting without an id reports it as absent',
          props: { position: point(0, 0) },
          callbacks: ['onSelect'],
          interactions: [
            pointer(NO_ID_NODE, 'pointerdown', 10, 10),
            pointer(NO_ID_NODE, 'pointerup', 10, 10),
          ],
        },
        {
          name: 'dragging reports canvas deltas and a final end',
          props: { id: 'a', position: point(0, 0) },
          callbacks: ['onDrag', 'onSelect'],
          interactions: [
            pointer(NODE, 'pointerdown', 0, 0),
            // A move with no displacement is ignored.
            pointer(NODE, 'pointermove', 0, 0),
            pointer(NODE, 'pointermove', 30, 40),
            pointer(NODE, 'pointermove', 50, 60),
            pointer(NODE, 'pointerup', 50, 60),
          ],
        },
        {
          name: 'a resize gesture reports the new size and a final end',
          props: { id: 'a', position: point(10, 20), size: size(80, 40) },
          callbacks: ['onResize'],
          interactions: [
            pointer(HANDLE, 'pointerdown', 0, 0),
            pointer(HANDLE, 'pointermove', 20, 10),
            pointer(HANDLE, 'pointerup', 20, 10),
          ],
        },
        {
          name: 'no resize handle without a size',
          props: { id: 'a', position: point(0, 0) },
          callbacks: ['onResize'],
        },
        {
          name: 'later props move, resize, select and unselect the node',
          props: { id: 'a', position: point(0, 0), size: size(80, 40), selected: true },
          callbacks: ['onResize'],
          interactions: [
            {
              type: 'props',
              props: {
                position: point(40, 60),
                size: size(120, 60),
                selected: false,
                ariaLabel: 'Moved',
              },
            },
            { type: 'props', props: { id: 'b' } },
          ],
        },
      ],
    },
    {
      component: 'CanvasEdge',
      cases: [
        {
          name: 'a straight edge between two points',
          props: { from: point(0, 0), to: point(100, 100) },
        },
        {
          name: 'a bezier edge',
          props: { from: point(0, 0), to: point(200, 100), kind: 'bezier' },
        },
        {
          name: 'an orthogonal edge',
          props: { from: point(0, 0), to: point(100, 50), kind: 'orthogonal' },
        },
        {
          name: 'stroke width and color',
          props: {
            from: point(50, 60),
            to: point(150, 110),
            strokeWidth: 10,
            stroke: '#ff0000',
          },
        },
        {
          name: 'an edge spanning the bounding box in the negative direction',
          props: { from: point(100, 100), to: point(0, 0) },
        },
        {
          name: 'aria label and classes',
          props: {
            from: point(0, 0),
            to: point(10, 10),
            ariaLabel: 'Connector',
            className: 'parity-edge',
          },
        },
        {
          name: 'later props change the geometry and the kind',
          props: { from: point(0, 0), to: point(100, 0) },
          interactions: [
            { type: 'props', props: { to: point(0, 100), kind: 'bezier', strokeWidth: 4 } },
          ],
        },
      ],
    },
  ],
  values: [
    {
      export: 'buildEdgePath',
      calls: [
        [point(0, 0), point(100, 50), 'line'],
        [point(0, 0), point(100, 50), 'orthogonal'],
        [point(0, 0), point(200, 100), 'bezier'],
        // Handles are at least 20 units even when the endpoints are close.
        [point(0, 0), point(10, 100), 'bezier'],
        [point(50, 50), point(50, 10), 'line'],
      ],
    },
    {
      export: 'screenToCanvas',
      calls: [
        [point(100, 50), viewport(10, 20, 1)],
        [point(100, 50), viewport(-50, 30, 2)],
        // A zero zoom is treated as identity rather than producing infinities.
        [point(100, 0), viewport(0, 0, 0)],
      ],
    },
    {
      export: 'canvasToScreen',
      calls: [
        [point(100, 50), viewport(10, 20, 1)],
        [point(100, 50), viewport(-50, 30, 2)],
        [point(0, 0), viewport(0, 0, 0.5)],
      ],
    },
    {
      export: 'clampViewport',
      calls: [
        [viewport(1, 2, 3)],
        [viewport(0, 0, 10), { minZoom: 0.5, maxZoom: 4 }],
        [viewport(0, 0, 0.1), { minZoom: 0.5, maxZoom: 4 }],
        [viewport(-100, 500, 1), { bounds: { x: 0, y: 0, width: 200, height: 200 } }],
        [viewport(50, 50, 1), { minZoom: 2 }],
      ],
    },
    {
      export: 'fitToBounds',
      calls: [
        [{ x: 5, y: 7, width: 0, height: 0 }, size(100, 100)],
        [{ x: 0, y: 0, width: 100, height: 100 }, size(200, 200)],
        [{ x: 0, y: 0, width: 100, height: 50 }, size(200, 200)],
        [{ x: 10, y: 10, width: 100, height: 50 }, size(200, 200), 20],
      ],
    },
  ],
  hooks: [
    {
      hook: 'useCanvasViewport',
      reactiveArgs: true,
      cases: [
        { name: 'seeds from the initial viewport', args: [{ initial: viewport(10, 20, 2) }] },
        { name: 'defaults to the identity viewport' },
        {
          name: 'panBy divides the screen delta by the zoom',
          args: [{ initial: viewport(0, 0, 2) }],
          steps: [{ type: 'call', method: 'panBy', args: [100, 50] }],
        },
        {
          name: 'panBy treats a zero zoom as identity',
          args: [{ initial: viewport(0, 0, 0) }],
          steps: [{ type: 'call', method: 'panBy', args: [40, 20] }],
        },
        {
          name: 'zoomBy holds the focal point fixed',
          args: [{ initial: viewport(0, 0, 1) }],
          steps: [{ type: 'call', method: 'zoomBy', args: [2, 50, 50] }],
        },
        {
          name: 'zoomBy ignores a non-positive factor',
          args: [{ initial: viewport(1, 2, 1) }],
          steps: [{ type: 'call', method: 'zoomBy', args: [0, 10, 10] }],
        },
        {
          name: 'setViewport clamps through the limits',
          args: [{ initial: viewport(0, 0, 1), limits: { minZoom: 0.5, maxZoom: 4 } }],
          steps: [{ type: 'call', method: 'setViewport', args: [viewport(0, 0, 99)] }],
        },
        {
          name: 'zoomBy clamps through the limits',
          args: [{ initial: viewport(0, 0, 1), limits: { minZoom: 0.5, maxZoom: 2 } }],
          steps: [{ type: 'call', method: 'zoomBy', args: [10, 0, 0] }],
        },
        {
          name: 'reset returns to the initial viewport',
          args: [{ initial: viewport(5, 5, 1) }],
          steps: [
            { type: 'call', method: 'panBy', args: [40, 40] },
            { type: 'call', method: 'reset' },
          ],
        },
        {
          name: 'controlled mode reports updates and keeps the given viewport',
          args: [{ value: viewport(0, 0, 1), onChange: { $fn: 'onChange' } }],
          steps: [
            { type: 'call', method: 'panBy', args: [20, 0] },
            { type: 'call', method: 'zoomBy', args: [2, 10, 10] },
          ],
        },
        {
          name: 'a new options object follows the viewport and keeps the seed',
          args: [
            { initial: viewport(1, 2, 1), value: viewport(1, 2, 1), onChange: { $fn: 'onChange' } },
          ],
          steps: [
            {
              type: 'args',
              args: [
                {
                  initial: viewport(99, 99, 3),
                  value: viewport(7, 8, 2),
                  onChange: { $fn: 'onChange' },
                },
              ],
            },
            { type: 'call', method: 'reset' },
          ],
        },
      ],
    },
    {
      hook: 'useCanvasSelection',
      reactiveArgs: true,
      cases: [
        { name: 'starts empty' },
        { name: 'seeds from the initial ids', args: [{ initial: ['a', 'b'] }] },
        {
          name: 'select replaces the selection by default',
          args: [{ initial: ['a'] }],
          steps: [
            { type: 'call', method: 'select', args: [['b']] },
            { type: 'call', method: 'isSelected', args: ['a'] },
            { type: 'call', method: 'isSelected', args: ['b'] },
          ],
        },
        {
          name: 'an additive select merges',
          args: [{ initial: ['a'] }],
          steps: [{ type: 'call', method: 'select', args: [['b', 'c'], true] }],
        },
        {
          name: 'toggle flips a membership',
          steps: [
            { type: 'call', method: 'toggle', args: ['a'] },
            { type: 'call', method: 'toggle', args: ['a'] },
            { type: 'call', method: 'toggle', args: ['b'] },
          ],
        },
        {
          name: 'deselect removes a present id and ignores an absent one',
          args: [{ initial: ['a', 'b'] }],
          steps: [
            { type: 'call', method: 'deselect', args: ['a'] },
            { type: 'call', method: 'deselect', args: ['z'] },
          ],
        },
        {
          name: 'clear empties the selection',
          args: [{ initial: ['a', 'b'] }],
          steps: [{ type: 'call', method: 'clear' }],
        },
        {
          name: 'controlled mode reports each change and keeps the given set',
          args: [{ value: new Set(['a']), onChange: { $fn: 'onChange' } }],
          steps: [
            { type: 'call', method: 'toggle', args: ['b'] },
            { type: 'call', method: 'select', args: [['c'], true] },
          ],
        },
        {
          name: 'a later controlled set replaces the selection',
          args: [{ value: new Set(['a']), onChange: { $fn: 'onChange' } }],
          steps: [
            { type: 'args', args: [{ value: new Set(['x', 'y']), onChange: { $fn: 'onChange' } }] },
          ],
        },
      ],
    },
  ],
}
