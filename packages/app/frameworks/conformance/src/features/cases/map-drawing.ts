/**
 * `@molecule/app-map-drawing-react` cases: the toolbar (`MapDrawingToolbar`,
 * one button per drawing tool plus select / cancel-draft / delete) and the
 * interaction surface (`MapDrawing` — the map slot, the shape overlay, the
 * polygon / line drafts, the circle drag, the pin placement and the marquee
 * selection with its delete), plus the geometry helpers
 * (`toRadians`, `haversineDistanceMeters`, `closeRing`, `pointInRect`,
 * `identityBackend`).
 *
 * The two components are the package's only runtime component exports;
 * `MapShape`, `MapDrawingProps`, `MapDrawingBackend` and the GeoJSON types are
 * types. No case shows time, so no case pins `now`.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The drawing surface React renders (`<div role="img">`). */
const SURFACE = '[data-mol-id="map-drawing-surface"]'

/** The surface's box, which jsdom does not compute; pointer coordinates are surface-relative. */
const surfaceLayout = [{ selector: SURFACE, rect: { width: 200, height: 200 } }]

/** The four drawing tools, in the order React shows them by default. */
const allTools = ['polygon', 'circle', 'pin', 'line']

/** Three pins whose ids and positions the marquee/delete cases rely on. */
const seedPins = [
  { id: 'a', kind: 'pin', geometry: { type: 'Point', coordinates: [10, 10] } },
  { id: 'b', kind: 'pin', geometry: { type: 'Point', coordinates: [50, 50] } },
  { id: 'c', kind: 'pin', geometry: { type: 'Point', coordinates: [150, 150] } },
]

/** One shape of each kind, so a case renders every overlay branch. */
const everyKind = [
  { id: 'pin', kind: 'pin', geometry: { type: 'Point', coordinates: [10, 10] } },
  {
    id: 'circle',
    kind: 'circle',
    geometry: { type: 'Point', coordinates: [40, 40] },
    properties: { radiusMeters: 100 },
  },
  {
    id: 'line',
    kind: 'line',
    geometry: {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [60, 20],
      ],
    },
  },
  {
    id: 'poly',
    kind: 'polygon',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [40, 0],
          [40, 40],
          [0, 0],
        ],
      ],
    },
  },
]

/**
 * The identity projection React uses when `mapBackend` is omitted, with a plane
 * distance, so a drawn shape's coordinates and a circle's radius are the
 * pointer's own numbers in every framework. (`MapDrawing` mints each shape's id
 * with `crypto.randomUUID()`, which the kit counts in every case.)
 */
const drawingBackend = {
  project: (coordinates: [number, number]): { x: number; y: number } => ({
    x: coordinates[0],
    y: coordinates[1],
  }),
  unproject: (point: { x: number; y: number }): [number, number] => [point.x, point.y],
  distanceMeters: (a: [number, number], b: [number, number]): number => {
    const dx = a[0] - b[0]
    const dy = a[1] - b[1]
    return Math.sqrt(dx * dx + dy * dy)
  },
}

/** `@molecule/app-map-drawing-react`. */
export const mapDrawingFeature: FeatureCases = {
  package: '@molecule/app-map-drawing-react',
  values: [
    {
      export: 'toRadians',
      calls: [[0], [90], [180], [-45], [360]],
    },
    {
      export: 'haversineDistanceMeters',
      calls: [
        [
          [0, 0],
          [0, 0],
        ],
        [
          [0, 0],
          [1, 0],
        ],
        [
          [0, 0],
          [0, 1],
        ],
        [
          [-73.9857, 40.7484],
          [-0.1276, 51.5072],
        ],
        [
          [10, -20],
          [-30, 40],
        ],
      ],
    },
    {
      export: 'closeRing',
      calls: [
        [[]],
        [[[0, 0]]],
        [
          [
            [0, 0],
            [1, 1],
          ],
        ],
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
          ],
        ],
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      ],
    },
    {
      export: 'pointInRect',
      calls: [
        [
          { x: 5, y: 5 },
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        [
          { x: 5, y: 5 },
          { x: 10, y: 10 },
          { x: 0, y: 0 },
        ],
        [
          { x: 11, y: 5 },
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        [
          { x: -1, y: -1 },
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
      ],
    },
    { export: 'identityBackend' },
  ],
  families: [
    {
      component: 'MapDrawingToolbar',
      cases: [
        {
          name: 'defaults',
          props: { tools: allTools, activeTool: 'polygon', hasSelection: false, hasDraft: false },
        },
        {
          name: 'the circle tool is active',
          props: { tools: allTools, activeTool: 'circle', hasSelection: false, hasDraft: false },
        },
        {
          name: 'the pin tool is active',
          props: { tools: allTools, activeTool: 'pin', hasSelection: false, hasDraft: false },
        },
        {
          name: 'the line tool is active',
          props: { tools: allTools, activeTool: 'line', hasSelection: false, hasDraft: false },
        },
        {
          name: 'the select tool is active',
          props: { tools: allTools, activeTool: 'select', hasSelection: false, hasDraft: false },
        },
        {
          name: 'an active tool that is not offered selects nothing',
          props: {
            tools: ['pin', 'line'],
            activeTool: 'circle',
            hasSelection: false,
            hasDraft: false,
          },
        },
        {
          name: 'a custom tool order and subset',
          props: {
            tools: ['pin', 'polygon'],
            activeTool: 'pin',
            hasSelection: false,
            hasDraft: false,
          },
        },
        {
          name: 'an empty tools list leaves the actions',
          props: { tools: [], activeTool: 'polygon', hasSelection: false, hasDraft: false },
        },
        {
          name: 'a selection enables delete',
          props: { tools: allTools, activeTool: 'select', hasSelection: true, hasDraft: false },
        },
        {
          name: 'a draft enables cancel',
          props: { tools: allTools, activeTool: 'polygon', hasSelection: false, hasDraft: true },
        },
        {
          name: 'a selection and a draft enable both actions',
          props: { tools: allTools, activeTool: 'select', hasSelection: true, hasDraft: true },
        },
        {
          name: 'a tool click reports the tool',
          props: { tools: allTools, activeTool: 'polygon', hasSelection: false, hasDraft: false },
          callbacks: ['onActiveToolChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="map-drawing-tool-circle"]' }],
        },
        {
          name: 'a select click reports select',
          props: { tools: allTools, activeTool: 'pin', hasSelection: false, hasDraft: false },
          callbacks: ['onActiveToolChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="map-drawing-tool-select"]' }],
        },
        {
          name: 'a cancel-draft click reports the cancel',
          props: { tools: allTools, activeTool: 'polygon', hasSelection: false, hasDraft: true },
          callbacks: ['onCancelDraft'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="map-drawing-tool-cancel-draft"]' },
          ],
        },
        {
          name: 'a delete click reports the delete',
          props: { tools: allTools, activeTool: 'select', hasSelection: true, hasDraft: false },
          callbacks: ['onDeleteSelected'],
          interactions: [{ type: 'click', selector: '[data-mol-id="map-drawing-tool-delete"]' }],
        },
        {
          name: 'a disabled cancel-draft click reports nothing',
          props: { tools: allTools, activeTool: 'polygon', hasSelection: false, hasDraft: false },
          callbacks: ['onCancelDraft'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="map-drawing-tool-cancel-draft"]' },
          ],
        },
        {
          name: 'the active tool follows a props change',
          props: { tools: allTools, activeTool: 'polygon', hasSelection: false, hasDraft: false },
          interactions: [
            { type: 'props', props: { activeTool: 'line' } },
            { type: 'props', props: { activeTool: 'select' } },
          ],
        },
        {
          name: 'the tools change from the parent',
          props: { tools: allTools, activeTool: 'pin', hasSelection: false, hasDraft: false },
          interactions: [
            { type: 'props', props: { tools: ['circle'] } },
            { type: 'props', props: { tools: [] } },
          ],
        },
        {
          name: 'the action flags change from the parent',
          props: { tools: allTools, activeTool: 'polygon', hasSelection: false, hasDraft: false },
          interactions: [
            { type: 'props', props: { hasSelection: true, hasDraft: true } },
            { type: 'props', props: { hasSelection: false, hasDraft: false } },
          ],
        },
        {
          name: 'a locale switch re-renders the labels',
          props: { tools: allTools, activeTool: 'polygon', hasSelection: false, hasDraft: false },
          context: {
            translations: {
              de: {
                mapDrawing: {
                  tool: {
                    polygon: 'Vieleck',
                    circle: 'Kreis',
                    pin: 'Markierung',
                    line: 'Linie',
                    select: 'Auswählen',
                    cancelDraft: 'Entwurf verwerfen',
                    delete: 'Löschen',
                  },
                  toolbar: { aria: 'Zeichenwerkzeuge' },
                },
              },
            },
          },
          interactions: [{ type: 'locale', locale: 'de' }],
        },
      ],
    },
    {
      component: 'MapDrawing',
      cases: [
        { name: 'defaults', callbacks: ['onChange'] },
        {
          name: 'className passthrough',
          props: { className: 'parity-token' },
          callbacks: ['onChange'],
        },
        {
          name: 'numeric width and height',
          props: { width: 220, height: 120 },
          callbacks: ['onChange'],
        },
        {
          name: 'string width and height',
          props: { width: '50%', height: '60vh' },
          callbacks: ['onChange'],
        },
        {
          name: 'a custom tool list seeds the active tool',
          props: { tools: ['pin', 'polygon'] },
          callbacks: ['onChange'],
        },
        {
          name: 'an empty tool list falls back to polygon',
          props: { tools: [] },
          callbacks: ['onChange'],
        },
        {
          name: 'the pin tool is active',
          props: { activeTool: 'pin' },
          callbacks: ['onChange'],
        },
        {
          name: 'the select tool is active',
          props: { activeTool: 'select' },
          callbacks: ['onChange'],
        },
        {
          name: 'the circle tool is active',
          props: { activeTool: 'circle' },
          callbacks: ['onChange'],
        },
        {
          name: 'the line tool is active',
          props: { activeTool: 'line' },
          callbacks: ['onChange'],
        },
        {
          name: 'a map slot renders under the overlay',
          slots: {
            mapSlot: [{ tag: 'div', attrs: { 'data-map': '' }, children: ['Map'] }],
          },
          callbacks: ['onChange'],
        },
        {
          name: 'every shape kind renders in the overlay',
          props: { initialShapes: everyKind },
          callbacks: ['onChange'],
        },
        {
          name: 'a circle without a radius renders a zero radius',
          props: {
            initialShapes: [
              { id: 'c0', kind: 'circle', geometry: { type: 'Point', coordinates: [0, 0] } },
            ],
          },
          callbacks: ['onChange'],
        },
        {
          name: 'a shape whose kind and geometry disagree renders nothing',
          props: {
            initialShapes: [
              { id: 'odd', kind: 'pin', geometry: { type: 'LineString', coordinates: [[0, 0]] } },
              { id: 'ok', kind: 'pin', geometry: { type: 'Point', coordinates: [5, 5] } },
            ],
          },
          callbacks: ['onChange'],
        },
        {
          name: 'a marquee selects the shapes it covers and delete keeps the rest',
          props: { initialShapes: seedPins, activeTool: 'select' },
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 0, clientY: 0 },
            { type: 'pointer', selector: SURFACE, event: 'pointermove', clientX: 80, clientY: 80 },
            { type: 'pointer', selector: SURFACE, event: 'pointerup', clientX: 80, clientY: 80 },
            { type: 'click', selector: '[data-mol-id="map-drawing-tool-delete"]' },
          ],
        },
        {
          name: 'a marquee over empty space selects nothing',
          props: { initialShapes: seedPins, activeTool: 'select' },
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            {
              type: 'pointer',
              selector: SURFACE,
              event: 'pointerdown',
              clientX: 100,
              clientY: 100,
            },
            {
              type: 'pointer',
              selector: SURFACE,
              event: 'pointermove',
              clientX: 120,
              clientY: 120,
            },
            { type: 'pointer', selector: SURFACE, event: 'pointerup', clientX: 120, clientY: 120 },
            { type: 'click', selector: '[data-mol-id="map-drawing-tool-delete"]' },
          ],
        },
        {
          name: 'a marquee skips shapes with no anchor point',
          props: {
            activeTool: 'select',
            initialShapes: [
              { id: 'empty-line', kind: 'line', geometry: { type: 'LineString', coordinates: [] } },
              {
                id: 'empty-poly',
                kind: 'polygon',
                geometry: { type: 'Polygon', coordinates: [] },
              },
            ],
          },
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 0, clientY: 0 },
            {
              type: 'pointer',
              selector: SURFACE,
              event: 'pointermove',
              clientX: 200,
              clientY: 200,
            },
            { type: 'pointer', selector: SURFACE, event: 'pointerup', clientX: 200, clientY: 200 },
          ],
        },
        {
          name: 'the marquee rectangle follows the drag',
          props: { initialShapes: seedPins, activeTool: 'select' },
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 0, clientY: 0 },
            { type: 'pointer', selector: SURFACE, event: 'pointermove', clientX: 80, clientY: 40 },
            { type: 'pointer', selector: SURFACE, event: 'pointermove', clientX: 20, clientY: 60 },
            { type: 'pointer', selector: SURFACE, event: 'pointerup', clientX: 20, clientY: 60 },
          ],
        },
        {
          name: 'a polygon draft renders its vertices',
          props: { activeTool: 'polygon' },
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 10, clientY: 10 },
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 100, clientY: 10 },
          ],
        },
        {
          name: 'a polygon finalises on double click',
          props: { activeTool: 'polygon', mapBackend: drawingBackend },
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 10, clientY: 10 },
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 100, clientY: 10 },
            {
              type: 'pointer',
              selector: SURFACE,
              event: 'pointerdown',
              clientX: 100,
              clientY: 100,
            },
            { type: 'event', selector: SURFACE, event: 'dblclick', bubbles: true },
          ],
        },
        {
          name: 'a polygon with fewer than three vertices does not finalise',
          props: { activeTool: 'polygon', mapBackend: drawingBackend },
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 10, clientY: 10 },
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 100, clientY: 10 },
            { type: 'event', selector: SURFACE, event: 'dblclick', bubbles: true },
          ],
        },
        {
          name: 'a line finalises on double click',
          props: { activeTool: 'line', mapBackend: drawingBackend },
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 0, clientY: 0 },
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 50, clientY: 50 },
            { type: 'event', selector: SURFACE, event: 'dblclick', bubbles: true },
          ],
        },
        {
          name: 'a line with a single vertex does not finalise',
          props: { activeTool: 'line', mapBackend: drawingBackend },
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 0, clientY: 0 },
            { type: 'event', selector: SURFACE, event: 'dblclick', bubbles: true },
          ],
        },
        {
          name: 'a pin placement adds a pin',
          props: { activeTool: 'pin', mapBackend: drawingBackend },
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 10, clientY: 20 },
          ],
        },
        {
          name: 'a circle drag commits a circle',
          props: { activeTool: 'circle', mapBackend: drawingBackend },
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 50, clientY: 50 },
            { type: 'pointer', selector: SURFACE, event: 'pointermove', clientX: 80, clientY: 90 },
            { type: 'pointer', selector: SURFACE, event: 'pointerup', clientX: 80, clientY: 90 },
          ],
        },
        {
          name: 'a circle drag renders its outline',
          props: { activeTool: 'circle', mapBackend: drawingBackend },
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 50, clientY: 50 },
            { type: 'pointer', selector: SURFACE, event: 'pointermove', clientX: 80, clientY: 90 },
          ],
        },
        {
          name: 'a circle with no drag commits nothing',
          props: { activeTool: 'circle', mapBackend: drawingBackend },
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 50, clientY: 50 },
            { type: 'pointer', selector: SURFACE, event: 'pointerup', clientX: 50, clientY: 50 },
          ],
        },
        {
          name: 'a pointer move with no draft is inert',
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointermove', clientX: 40, clientY: 40 },
            { type: 'pointer', selector: SURFACE, event: 'pointerup', clientX: 40, clientY: 40 },
          ],
        },
        {
          name: 'an uncontrolled tool click switches and clears the draft',
          callbacks: ['onChange', 'onActiveToolChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 10, clientY: 10 },
            { type: 'click', selector: '[data-mol-id="map-drawing-tool-circle"]' },
          ],
        },
        {
          name: 'a controlled tool click reports but keeps the prop',
          props: { activeTool: 'pin' },
          callbacks: ['onChange', 'onActiveToolChange'],
          layout: surfaceLayout,
          interactions: [{ type: 'click', selector: '[data-mol-id="map-drawing-tool-line"]' }],
        },
        {
          name: 'a controlled tool change clears the draft',
          props: { activeTool: 'polygon' },
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 10, clientY: 10 },
            { type: 'props', props: { activeTool: 'line' } },
          ],
        },
        {
          name: 'an active tool change discards a circle draft',
          props: { activeTool: 'circle' },
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 50, clientY: 50 },
            { type: 'props', props: { activeTool: 'select' } },
          ],
        },
        {
          name: 'the cancel-draft button discards the draft',
          callbacks: ['onChange'],
          layout: surfaceLayout,
          interactions: [
            { type: 'pointer', selector: SURFACE, event: 'pointerdown', clientX: 10, clientY: 10 },
            { type: 'click', selector: '[data-mol-id="map-drawing-tool-cancel-draft"]' },
          ],
        },
        {
          name: 'initial shapes are seeded once and later props are ignored',
          props: { initialShapes: [seedPins[0]] },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { initialShapes: [...seedPins] } },
            { type: 'props', props: { initialShapes: [] } },
          ],
        },
        {
          name: 'width, height and className change from the parent',
          props: { width: 200, height: 100, className: 'parity-token' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { width: '80%', height: 50 } },
            { type: 'props', props: { className: 'other-token' } },
          ],
        },
        {
          name: 'a locale switch re-renders the surface label',
          context: {
            translations: {
              de: {
                mapDrawing: {
                  surface: { aria: 'Zeichenfläche' },
                  tool: {
                    polygon: 'Vieleck',
                    circle: 'Kreis',
                    pin: 'Markierung',
                    line: 'Linie',
                    select: 'Auswählen',
                    cancelDraft: 'Entwurf verwerfen',
                    delete: 'Löschen',
                  },
                  toolbar: { aria: 'Zeichenwerkzeuge' },
                },
              },
            },
          },
          callbacks: ['onChange'],
          interactions: [{ type: 'locale', locale: 'de' }],
        },
      ],
    },
  ],
}
