/**
 * `@molecule/app-flow-canvas-react` cases: the `<FlowCanvas>` node-and-edge
 * editor (drag, connect, pan, select, delete) and the pure geometry helpers it
 * exports.
 *
 * Every case that lets the canvas build an edge pins `now`: a new edge's id
 * carries `Date.now()`, so the recorded id is stable only with the clock fixed.
 *
 * @module
 */

import type { NodeSpec } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** The instant every case's `Date.now()` is pinned to (2026-05-13T12:00:00Z). */
const NOW = Date.UTC(2026, 4, 13, 12, 0, 0)

/** A node at a world position, with the default size. */
const node = (
  id: string,
  type: string,
  x: number,
  y: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({ id, type, position: { x, y }, ...extra })

/** The fallback content a case passes as `children`. */
const fallback: NodeSpec[] = [
  { tag: 'span', attrs: { 'data-fallback': 'yes' }, children: ['fallback content'] },
]

/** A node renderer that names its node's id and label. */
const taskRenderer = {
  $fn: 'taskRenderer',
  nodes: [
    {
      tag: 'strong',
      attrs: { 'data-task': '{0.id}' },
      children: ['Task {0.data.label}'],
    },
  ],
}

/** A second node renderer, so two types prove the map is consulted per type. */
const decisionRenderer = {
  $fn: 'decisionRenderer',
  nodes: [{ tag: 'em', attrs: { 'data-decision': '{0.id}' }, children: ['{0.id}?'] }],
}

/** A renderer that puts a text field inside the node, for the delete-key guard. */
const inputRenderer = {
  $fn: 'inputRenderer',
  nodes: [{ tag: 'input', attrs: { 'data-field': '', 'aria-label': 'Step name' } }],
}

/** `@molecule/app-flow-canvas-react`. */
export const flowCanvasFeature: FeatureCases = {
  package: '@molecule/app-flow-canvas-react',
  families: [
    {
      component: 'FlowCanvas',
      cases: [
        // The first case also runs again with a pseudo-locale switch
        // ("…, then a locale switch"): the root and handle labels are
        // translated, so the switched snapshot reads the pseudo-locale's `⟦…⟧`.
        { name: 'an empty graph', props: { nodes: [], edges: [] } },
        {
          name: 'nodes render at their positions with the default size',
          props: {
            nodes: [node('a', 'task', 10, 20), node('b', 'decision', 220, 140)],
            edges: [],
          },
        },
        {
          name: 'explicit widths and heights override the defaults',
          props: {
            nodes: [
              node('wide', 'task', 0, 0, { width: 260, height: 120 }),
              node('small', 'task', 300, 0, { width: 100, height: 40 }),
            ],
            edges: [],
          },
        },
        {
          name: 'node renderers are chosen by node type',
          props: {
            nodes: [
              node('a', 'task', 0, 0, { data: { label: 'Start' } }),
              node('b', 'decision', 220, 0, { data: { label: 'Go?' } }),
            ],
            edges: [],
            nodeRenderers: { task: taskRenderer, decision: decisionRenderer },
          },
        },
        {
          name: 'children render inside every node without a renderer',
          props: { nodes: [node('a', 'task', 0, 0), node('b', 'note', 220, 0)], edges: [] },
          children: fallback,
        },
        {
          name: 'a renderer wins over the children fallback for its type',
          props: {
            nodes: [
              node('a', 'task', 0, 0, { data: { label: 'Start' } }),
              node('b', 'note', 220, 0),
            ],
            edges: [],
            nodeRenderers: { task: taskRenderer },
          },
          children: fallback,
        },
        {
          name: 'one path per edge, and an edge without both endpoints renders nothing',
          props: {
            nodes: [node('a', 'task', 0, 0), node('b', 'task', 200, 100)],
            edges: [
              { id: 'e1', source: 'a', target: 'b' },
              { id: 'e2', source: 'b', target: 'a', sourceHandle: 'out', targetHandle: 'in' },
              { id: 'self', source: 'a', target: 'a' },
              { id: 'orphan', source: 'a', target: 'missing' },
            ],
          },
        },
        {
          name: 'the grid can be hidden',
          props: { nodes: [node('a', 'task', 0, 0)], edges: [], showGrid: false },
        },
        {
          name: 'an initial viewport pans and zooms the world',
          props: {
            nodes: [node('a', 'task', 0, 0)],
            edges: [],
            initialViewport: { x: 40, y: -20, zoom: 1.5 },
          },
        },
        {
          name: 'className is merged onto the root',
          props: { nodes: [], edges: [], className: 'parity-token' },
        },
        {
          name: 'clicking an edge selects it and calls onEdgeClick',
          props: {
            nodes: [node('a', 'task', 0, 0), node('b', 'task', 200, 0)],
            edges: [{ id: 'e1', source: 'a', target: 'b' }],
          },
          callbacks: ['onEdgeClick', 'onSelectionChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="flow-canvas-edge-hit-e1"]' }],
        },
        {
          name: 'clicking another edge replaces the selection',
          props: {
            nodes: [node('a', 'task', 0, 0), node('b', 'task', 200, 0), node('c', 'task', 400, 0)],
            edges: [
              { id: 'e1', source: 'a', target: 'b' },
              { id: 'e2', source: 'b', target: 'c' },
            ],
          },
          callbacks: ['onSelectionChange'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="flow-canvas-edge-hit-e1"]' },
            { type: 'click', selector: '[data-mol-id="flow-canvas-edge-hit-e2"]' },
          ],
        },
        {
          name: 'pressing a node selects it and calls onNodeClick',
          props: { nodes: [node('a', 'task', 0, 0)], edges: [] },
          callbacks: ['onNodeClick', 'onSelectionChange'],
          interactions: [
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-a"]',
              event: 'pointerdown',
              clientX: 10,
              clientY: 10,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-a"]',
              event: 'pointerup',
              clientX: 10,
              clientY: 10,
            },
          ],
        },
        {
          name: 'keyboard activation of the select button selects the node',
          props: { nodes: [node('a', 'task', 0, 0)], edges: [] },
          callbacks: ['onNodeClick', 'onSelectionChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="flow-canvas-node-select-a"]' }],
        },
        {
          name: 'Delete removes the selected edge in controlled mode',
          props: {
            nodes: [node('a', 'task', 0, 0), node('b', 'task', 200, 0)],
            edges: [{ id: 'e1', source: 'a', target: 'b' }],
          },
          callbacks: ['onChange', 'onSelectionChange'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="flow-canvas-edge-hit-e1"]' },
            { type: 'keydown', selector: '[data-mol-id="flow-canvas"]', key: 'Delete' },
          ],
        },
        {
          name: 'Backspace removes a selected node and its edges in uncontrolled mode',
          props: {
            nodes: [node('a', 'task', 0, 0), node('b', 'task', 200, 0)],
            edges: [{ id: 'e1', source: 'a', target: 'b' }],
          },
          callbacks: ['onSelectionChange'],
          interactions: [
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-a"]',
              event: 'pointerdown',
              clientX: 10,
              clientY: 10,
            },
            { type: 'keydown', selector: '[data-mol-id="flow-canvas"]', key: 'Backspace' },
          ],
        },
        {
          name: 'disableDeleteShortcut ignores the delete keys',
          props: {
            nodes: [node('a', 'task', 0, 0), node('b', 'task', 200, 0)],
            edges: [{ id: 'e1', source: 'a', target: 'b' }],
            disableDeleteShortcut: true,
          },
          callbacks: ['onChange', 'onSelectionChange'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="flow-canvas-edge-hit-e1"]' },
            { type: 'keydown', selector: '[data-mol-id="flow-canvas"]', key: 'Delete' },
            { type: 'keydown', selector: '[data-mol-id="flow-canvas"]', key: 'Backspace' },
          ],
        },
        {
          name: 'the delete keys are ignored while a text field has focus',
          props: {
            nodes: [node('a', 'task', 0, 0)],
            edges: [],
            nodeRenderers: { task: inputRenderer },
          },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-a"]',
              event: 'pointerdown',
              clientX: 10,
              clientY: 10,
            },
            { type: 'keydown', selector: 'input[data-field]', key: 'Delete' },
          ],
        },
        {
          name: 'dragging a node emits onChange per pointer move in controlled mode',
          props: { nodes: [node('a', 'task', 0, 0)], edges: [] },
          callbacks: ['onChange', 'onNodeClick', 'onSelectionChange'],
          interactions: [
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-a"]',
              event: 'pointerdown',
              clientX: 50,
              clientY: 50,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-a"]',
              event: 'pointermove',
              clientX: 70,
              clientY: 60,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-a"]',
              event: 'pointermove',
              clientX: 80,
              clientY: 65,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-a"]',
              event: 'pointerup',
              clientX: 80,
              clientY: 65,
            },
          ],
        },
        {
          name: 'dragging a node updates it in uncontrolled mode',
          props: { nodes: [node('a', 'task', 0, 0)], edges: [] },
          interactions: [
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-a"]',
              event: 'pointerdown',
              clientX: 50,
              clientY: 50,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-a"]',
              event: 'pointermove',
              clientX: 70,
              clientY: 60,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-a"]',
              event: 'pointermove',
              clientX: 80,
              clientY: 65,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-a"]',
              event: 'pointerup',
              clientX: 80,
              clientY: 65,
            },
          ],
        },
        {
          name: 'panning empty canvas moves the viewport',
          props: { nodes: [node('a', 'task', 0, 0)], edges: [] },
          interactions: [
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas"]',
              event: 'pointerdown',
              clientX: 100,
              clientY: 100,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas"]',
              event: 'pointermove',
              clientX: 130,
              clientY: 120,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas"]',
              event: 'pointerup',
              clientX: 130,
              clientY: 120,
            },
          ],
        },
        {
          name: 'disablePan keeps the viewport',
          props: { nodes: [], edges: [], disablePan: true },
          interactions: [
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas"]',
              event: 'pointerdown',
              clientX: 100,
              clientY: 100,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas"]',
              event: 'pointermove',
              clientX: 130,
              clientY: 120,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas"]',
              event: 'pointerup',
              clientX: 130,
              clientY: 120,
            },
          ],
        },
        {
          name: 'disableZoom renders the same canvas',
          props: { nodes: [node('a', 'task', 0, 0)], edges: [], disableZoom: true },
        },
        {
          name: 'dragging a source handle onto another node adds an edge',
          props: { nodes: [node('a', 'task', 0, 0), node('b', 'task', 300, 0)], edges: [] },
          callbacks: ['onChange', 'onNodeClick', 'onSelectionChange'],
          now: NOW,
          interactions: [
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-handle-a"]',
              event: 'pointerdown',
              clientX: 180,
              clientY: 40,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas"]',
              event: 'pointermove',
              clientX: 250,
              clientY: 40,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-b"]',
              event: 'pointerup',
              clientX: 320,
              clientY: 40,
            },
          ],
        },
        {
          name: 'releasing a handle over its own node makes no edge',
          props: { nodes: [node('a', 'task', 0, 0)], edges: [] },
          callbacks: ['onChange'],
          now: NOW,
          interactions: [
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-handle-a"]',
              event: 'pointerdown',
              clientX: 180,
              clientY: 40,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-a"]',
              event: 'pointerup',
              clientX: 100,
              clientY: 40,
            },
          ],
        },
        {
          name: 'a pending connection clears when released on empty canvas',
          props: { nodes: [node('a', 'task', 0, 0)], edges: [] },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-handle-a"]',
              event: 'pointerdown',
              clientX: 180,
              clientY: 40,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas"]',
              event: 'pointermove',
              clientX: 260,
              clientY: 90,
            },
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas"]',
              event: 'pointerup',
              clientX: 260,
              clientY: 90,
            },
          ],
        },
        {
          name: 'later props re-render nodes and edges in controlled mode',
          props: {
            nodes: [node('a', 'task', 0, 0), node('b', 'task', 200, 0)],
            edges: [{ id: 'e1', source: 'a', target: 'b' }],
          },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'props',
              props: { nodes: [node('a', 'task', 40, 30), node('b', 'task', 240, 0)] },
            },
            { type: 'props', props: { edges: [] } },
          ],
        },
        {
          name: 'the grid and the root classes follow later props',
          props: { nodes: [], edges: [] },
          interactions: [{ type: 'props', props: { showGrid: false, className: 'parity-later' } }],
        },
        {
          name: 'an uncontrolled canvas ignores later nodes props',
          props: { nodes: [node('a', 'task', 0, 0)], edges: [] },
          interactions: [
            {
              type: 'props',
              props: { nodes: [node('a', 'task', 0, 0), node('b', 'task', 200, 0)] },
            },
          ],
        },
        {
          name: 'an uncontrolled canvas ignores later initialViewport props',
          props: {
            nodes: [node('a', 'task', 0, 0)],
            edges: [],
            initialViewport: { x: 10, y: 20, zoom: 1 },
          },
          interactions: [{ type: 'props', props: { initialViewport: { x: 99, y: 99, zoom: 2 } } }],
        },
        {
          name: 'selection survives a props change in controlled mode',
          props: {
            nodes: [node('a', 'task', 0, 0), node('b', 'task', 200, 0)],
            edges: [],
          },
          callbacks: ['onChange', 'onSelectionChange'],
          interactions: [
            {
              type: 'pointer',
              selector: '[data-mol-id="flow-canvas-node-a"]',
              event: 'pointerdown',
              clientX: 10,
              clientY: 10,
            },
            {
              type: 'props',
              props: { nodes: [node('a', 'task', 60, 60), node('b', 'task', 200, 0)] },
            },
          ],
        },
      ],
    },
  ],
  values: [
    { export: 'DEFAULT_NODE_WIDTH' },
    { export: 'DEFAULT_NODE_HEIGHT' },
    {
      export: 'defaultSourcePort',
      calls: [
        [{ id: 'a', type: 't', position: { x: 10, y: 20 } }],
        [{ id: 'a', type: 't', position: { x: 0, y: 0 }, width: 100, height: 40 }],
      ],
    },
    {
      export: 'defaultTargetPort',
      calls: [
        [{ id: 'a', type: 't', position: { x: 10, y: 20 } }],
        [{ id: 'a', type: 't', position: { x: 0, y: 0 }, width: 100, height: 40 }],
      ],
    },
    {
      export: 'bezierPath',
      calls: [
        [
          { x: 0, y: 0 },
          { x: 100, y: 50 },
        ],
        [
          { x: 10, y: 10 },
          { x: 20, y: 90 },
        ],
        [
          { x: 0, y: 0 },
          { x: -40, y: 0 },
        ],
      ],
    },
    {
      export: 'moveNode',
      calls: [
        [
          [
            { id: 'a', type: 't', position: { x: 0, y: 0 } },
            { id: 'b', type: 't', position: { x: 50, y: 50 } },
          ],
          'a',
          { x: 5, y: 5 },
        ],
      ],
    },
    {
      export: 'translateNode',
      calls: [
        [
          [
            { id: 'a', type: 't', position: { x: 0, y: 0 } },
            { id: 'b', type: 't', position: { x: 50, y: 50 } },
          ],
          'b',
          10,
          -20,
        ],
      ],
    },
    {
      export: 'removeNode',
      calls: [
        [
          [
            { id: 'a', type: 't', position: { x: 0, y: 0 } },
            { id: 'b', type: 't', position: { x: 50, y: 0 } },
            { id: 'c', type: 't', position: { x: 100, y: 0 } },
          ],
          [
            { id: 'e1', source: 'a', target: 'b' },
            { id: 'e2', source: 'b', target: 'c' },
            { id: 'e3', source: 'a', target: 'c' },
          ],
          'b',
        ],
      ],
    },
    {
      export: 'removeEdge',
      calls: [
        [
          [
            { id: 'e1', source: 'a', target: 'b' },
            { id: 'e2', source: 'b', target: 'c' },
          ],
          'e1',
        ],
      ],
    },
    {
      export: 'addEdge',
      calls: [
        [[], { id: 'e1', source: 'a', target: 'b' }],
        [[], { id: 'e1', source: 'a', target: 'a' }],
        [[{ id: 'e1', source: 'a', target: 'b' }], { id: 'e2', source: 'a', target: 'b' }],
        [
          [{ id: 'e1', source: 'a', target: 'b', sourceHandle: 'out1' }],
          { id: 'e2', source: 'a', target: 'b', sourceHandle: 'out2' },
        ],
      ],
    },
    {
      export: 'clientToWorld',
      calls: [
        [50, 60, { left: 10, top: 20 }, { x: 5, y: 5, zoom: 2 }],
        [0, 0, { left: 0, top: 0 }, { x: 0, y: 0, zoom: 1 }],
        [120, 80, { left: 20, top: 10 }, { x: -30, y: 15, zoom: 0.5 }],
      ],
    },
  ],
}
