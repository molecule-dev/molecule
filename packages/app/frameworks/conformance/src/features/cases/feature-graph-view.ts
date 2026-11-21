/**
 * `@molecule/app-feature-graph-view-react` cases: the force-directed graph view
 * and the pure layout helpers it exports.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const a = { id: 'a', label: 'Alpha' }
const b = { id: 'b', label: 'Beta', group: 'project' }
const c = { id: 'c', label: 'Gamma', weight: 2 }
const d = { id: 'd', label: 'Delta', weight: 0.25 }
const ring = [a, b, c, d]
const ringEdges = [
  { id: 'e1', source: 'a', target: 'b' },
  { id: 'e2', source: 'b', target: 'c', weight: 3 },
  { id: 'e3', source: 'c', target: 'd' },
  { id: 'e4', source: 'd', target: 'a' },
]

/** `@molecule/app-feature-graph-view-react`. */
export const featureGraphViewFeature: FeatureCases = {
  package: '@molecule/app-feature-graph-view-react',
  families: [
    {
      component: 'GraphView',
      cases: [
        // Recorded with a pseudo-locale switch appended: the empty state is
        // translated text, so it must follow the locale.
        { name: 'empty graph', props: { nodes: [], edges: [] } },
        {
          name: 'circular layout with nodes and edges',
          props: { nodes: ring, edges: ringEdges, layout: 'circular' },
        },
        {
          name: 'grid layout',
          props: { nodes: ring, edges: ringEdges, layout: 'grid' },
        },
        {
          name: 'force layout, default options',
          props: { nodes: ring, edges: ringEdges },
        },
        {
          name: 'force layout with a seed and a low iteration cap',
          props: {
            nodes: ring,
            edges: ringEdges,
            layout: 'force',
            forceOptions: { seed: 1, iterations: 20 },
          },
        },
        {
          name: 'force layout honours every tunable',
          props: {
            nodes: ring,
            edges: ringEdges,
            forceOptions: {
              seed: 7,
              iterations: 12,
              repulsion: 400,
              spring: 0.1,
              restLength: 40,
              damping: 0.7,
            },
          },
        },
        {
          name: 'selected node',
          props: { nodes: ring, edges: [], layout: 'circular', selectedNodeId: 'c' },
        },
        {
          name: 'unweighted and zero-weight nodes',
          props: {
            nodes: [
              { id: 'zero', label: 'Zero', weight: 0 },
              { id: 'plain', label: 'Plain' },
            ],
            edges: [],
            layout: 'circular',
          },
        },
        {
          name: 'a single node sits at the origin',
          props: { nodes: [{ id: 'solo', label: 'Solo' }], edges: [], layout: 'circular' },
        },
        {
          name: 'edges with a missing endpoint are dropped',
          props: {
            nodes: [a, b],
            edges: [
              { id: 'ok', source: 'a', target: 'b' },
              { id: 'missing', source: 'a', target: 'nope' },
              { id: 'self', source: 'a', target: 'a' },
            ],
            layout: 'circular',
          },
        },
        {
          name: 'className is merged onto the wrapper',
          props: { nodes: [a], edges: [], layout: 'circular', className: 'parity-token' },
        },
        {
          name: 'clicking a node calls onNodeClick',
          props: { nodes: [a, b], edges: [], layout: 'circular' },
          callbacks: ['onNodeClick'],
          interactions: [{ type: 'click', selector: '[data-mol-id="graph-view-node-hit-b"]' }],
        },
        {
          name: 'clicking without a handler does nothing',
          props: { nodes: [a], edges: [], layout: 'circular' },
          interactions: [{ type: 'click', selector: '[data-mol-id="graph-view-node-hit-a"]' }],
        },
        {
          name: 'Enter and Space activate a node',
          props: { nodes: [a, b], edges: [], layout: 'circular' },
          callbacks: ['onNodeClick'],
          interactions: [
            { type: 'keydown', selector: '[data-mol-id="graph-view-node-hit-a"]', key: 'Enter' },
            { type: 'keydown', selector: '[data-mol-id="graph-view-node-hit-a"]', key: ' ' },
            { type: 'keydown', selector: '[data-mol-id="graph-view-node-hit-b"]', key: 'a' },
          ],
        },
        {
          name: 'custom node renderer replaces the default markup',
          props: {
            nodes: [a, c],
            edges: [],
            layout: 'circular',
            nodeRenderer: {
              $fn: 'nodeRenderer',
              nodes: [
                {
                  tag: 'text',
                  attrs: { 'data-test': 'custom-node', x: '{0.x}', y: '{0.y}' },
                  children: ['{0.label}:{0.id}'],
                },
              ],
            },
          },
        },
        {
          name: 'custom edge renderer replaces the default line',
          props: {
            nodes: [a, b],
            edges: [{ id: 'e1', source: 'a', target: 'b' }],
            layout: 'circular',
            edgeRenderer: {
              $fn: 'edgeRenderer',
              nodes: [
                {
                  tag: 'line',
                  attrs: {
                    'data-test': 'custom-edge',
                    x1: '{1.x}',
                    y1: '{1.y}',
                    x2: '{2.x}',
                    y2: '{2.y}',
                  },
                },
                {
                  tag: 'text',
                  attrs: { 'data-test': 'custom-edge-label' },
                  children: ['{0.id}'],
                },
              ],
            },
          },
        },
        {
          name: 'prop changes re-lay out and re-select',
          props: { nodes: ring, edges: ringEdges, layout: 'circular', selectedNodeId: 'a' },
          interactions: [
            { type: 'props', props: { layout: 'grid' } },
            { type: 'props', props: { selectedNodeId: 'd' } },
            { type: 'props', props: { nodes: [a, b], edges: ringEdges } },
            { type: 'props', props: { nodes: [], edges: [] } },
          ],
        },
      ],
    },
  ],
  values: [
    { export: 'DEFAULT_FORCE_ITERATIONS' },
    { export: 'DEFAULT_REPULSION' },
    { export: 'DEFAULT_SPRING' },
    { export: 'DEFAULT_REST_LENGTH' },
    { export: 'DEFAULT_DAMPING' },
    { export: 'CONVERGENCE_EPSILON' },
    {
      export: 'circularLayout',
      calls: [
        [[], 100],
        [[{ id: 'only', label: 'Only' }], 100],
        [ring, 100],
        [ring, 0],
      ],
    },
    {
      export: 'gridLayout',
      calls: [
        [[], 50],
        [[{ id: 'only', label: 'Only' }], 50],
        [ring, 50],
      ],
    },
    {
      export: 'forceLayout',
      calls: [
        [[], []],
        [[a, b], [], { iterations: 5, seed: 7 }],
        [ring, ringEdges, { iterations: 10, seed: 3, restLength: 30 }],
        [
          ring,
          [
            { id: 'self', source: 'a', target: 'a' },
            { id: 'ghost', source: 'a', target: 'nope' },
          ],
          { iterations: 5, seed: 1 },
        ],
      ],
    },
    {
      export: 'layoutNodes',
      calls: [
        [ring, ringEdges, 'circular'],
        [ring, ringEdges, 'grid'],
        [ring, ringEdges, 'force', { iterations: 5, seed: 1 }],
        [ring, ringEdges, 'force'],
        [[], [], 'circular'],
      ],
    },
    {
      export: 'boundingBox',
      calls: [
        [[]],
        [[{ id: 'a', label: 'A', x: 3, y: -4 }]],
        [[{ id: 'a', label: 'A', x: 0, y: 0 }], 10],
        [
          [
            { id: 'a', label: 'A', x: -5, y: 8 },
            { id: 'b', label: 'B', x: 12, y: -2 },
          ],
          0,
        ],
      ],
    },
  ],
  frameworkShaped: {
    createRng:
      'returns a stateful PRNG closure; a JSON value check cannot carry a function, so it is compared through the deterministic layouts every framework renders and records',
  },
}
