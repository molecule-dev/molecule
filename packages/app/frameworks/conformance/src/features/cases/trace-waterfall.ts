/**
 * `@molecule/app-trace-waterfall-react` cases: the distributed-trace span
 * waterfall in every shape it renders — nested trees, each status color, the
 * focused subtree, selection, the empty fallback and its custom node, row
 * clicks and keyboard activation — plus the pure helpers behind the rows
 * (`layoutSpans`, `serviceColor`, `formatDurationLabel`) and the translated
 * duration labels (`formatDurationParts`, `translateDuration`).
 *
 * No case pins `now`: nothing here reads the clock or formats a date.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A root span with two children, one of them with a child of its own. */
const SPANS = [
  {
    id: 'root',
    name: 'GET /checkout',
    service: 'api-gw',
    startTime: 0,
    duration: 320,
    status: 'ok',
  },
  {
    id: 'auth',
    parentId: 'root',
    name: 'verifyToken',
    service: 'auth-svc',
    startTime: 5,
    duration: 40,
    status: 'ok',
  },
  {
    id: 'db',
    parentId: 'root',
    name: 'db.query',
    service: 'postgres',
    startTime: 50,
    duration: 210,
    status: 'pending',
  },
  {
    id: 'cache',
    parentId: 'root',
    name: 'cache.get',
    service: 'redis',
    startTime: 45,
    duration: 8,
    status: 'error',
  },
  // No service, no status, a sub-millisecond duration and depth 2.
  { id: 'exec', parentId: 'db', name: 'pg.exec', startTime: 60, duration: 0.5 },
]

/** One span without a service or a status, so the bar takes the default color. */
const SOLO = [{ id: 'solo', name: 'lone', startTime: 0, duration: 10 }]

/** Durations either side of every `formatDurationLabel` boundary. */
const DURATIONS = [
  { id: 'fast', name: 'cache.read', service: 'redis', startTime: 0, duration: 0.25 },
  { id: 'slow', name: 'report.run', service: 'warehouse', startTime: 0.25, duration: 2500 },
]

/**
 * The translator the `translateDuration` value checks pass: it names the key
 * it was called with and the number it received, so the recorded value shows
 * both the unit each duration picks and the locale's number format.
 *
 * @param key - The translation key.
 * @param values - The interpolation values (`value`).
 * @returns A marked string.
 */
const translateDurationMarker = (key: string, values?: Record<string, string | number>): string =>
  `${key}(${values === undefined ? '' : String(values.value ?? '')})`

/**
 * The empty-state node a case hands the component as its `emptyState` prop.
 * A node travels in `props` as a `{ $nodes }` value: React receives an
 * element, Vue a VNode, Solid a JSX value, Svelte a snippet and Angular a
 * `TemplateRef` input.
 */
const EMPTY_NODE = [{ tag: 'p', attrs: { 'data-parity-empty': '' }, children: ['No trace data.'] }]

/** The `emptyState` prop value: the node above, in the kit's node-prop form. */
const EMPTY_STATE = { $nodes: EMPTY_NODE }

/** `@molecule/app-trace-waterfall-react`. */
export const traceWaterfallFeature: FeatureCases = {
  package: '@molecule/app-trace-waterfall-react',
  families: [
    {
      component: 'TraceWaterfall',
      cases: [
        { name: 'a single span without a service or status', props: { spans: SOLO } },
        {
          name: 'a nested trace with every status',
          props: { spans: SPANS },
        },
        {
          name: 'sub-millisecond and multi-second durations',
          props: { spans: DURATIONS },
        },
        {
          name: 'a focused subtree renders only that span and its descendants',
          props: { spans: SPANS, rootSpanId: 'db' },
        },
        {
          name: 'a rootSpanId missing from the trace renders every root',
          props: { spans: SPANS, rootSpanId: 'missing' },
        },
        {
          name: 'a selected span and the rest unselected',
          props: { spans: SPANS, selectedSpanId: 'auth' },
        },
        {
          name: 'the selection moves',
          props: { spans: SPANS, selectedSpanId: 'auth' },
          interactions: [{ type: 'props', props: { selectedSpanId: 'db' } }],
        },
        {
          name: 'extra classes are merged onto the root',
          props: { spans: SPANS, className: 'parity-token' },
        },
        {
          name: 'the trace is replaced',
          props: { spans: SOLO },
          interactions: [{ type: 'props', props: { spans: SPANS } }],
        },
        {
          name: 'the trace starts empty and fills',
          props: { spans: [] },
          interactions: [{ type: 'props', props: { spans: SPANS } }],
        },
        {
          name: 'every span collapses to a point',
          props: { spans: [{ id: 'a', name: 'point', startTime: 5, duration: 0 }] },
        },
        { name: 'no spans renders the default empty fallback', props: { spans: [] } },
        {
          name: 'no spans renders a custom empty state',
          props: { spans: [], emptyState: EMPTY_STATE },
        },
        {
          name: 'a custom empty state is ignored while spans render',
          props: { spans: SOLO, emptyState: EMPTY_STATE },
        },
        {
          name: 'clicking a row calls onSpanClick with its span',
          props: { spans: SPANS },
          callbacks: ['onSpanClick'],
          interactions: [{ type: 'click', selector: '[data-span-id="db"]' }],
        },
        {
          name: 'rows are keyboard-activatable with Enter and Space',
          props: { spans: SPANS },
          callbacks: ['onSpanClick'],
          interactions: [
            { type: 'keydown', selector: '[data-span-id="auth"]', key: 'Enter' },
            { type: 'keydown', selector: '[data-span-id="exec"]', key: ' ' },
            { type: 'keydown', selector: '[data-span-id="cache"]', key: 'a' },
            { type: 'keydown', selector: '[data-span-id="cache"]', key: 'Escape' },
          ],
        },
        {
          name: 'clicking a nested row calls onSpanClick with that span',
          props: { spans: SPANS, rootSpanId: 'db' },
          callbacks: ['onSpanClick'],
          interactions: [
            { type: 'click', selector: '[data-span-id="exec"]' },
            { type: 'click', selector: '[data-span-id="db"]' },
          ],
        },
      ],
    },
  ],
  values: [
    {
      export: 'layoutSpans',
      calls: [
        [SPANS],
        [SPANS, 'db'],
        [SPANS, 'missing'],
        [[]],
        [[{ id: 'x', parentId: 'missing', name: 'x', startTime: 0, duration: 5 }]],
        [[{ id: 'a', name: 'a', startTime: 5, duration: 0 }]],
        [
          [
            { id: 'a', name: 'a', startTime: 0, duration: 100 },
            { id: 'c', parentId: 'a', name: 'c', startTime: 50, duration: 10 },
            { id: 'b', parentId: 'a', name: 'b', startTime: 10, duration: 10 },
          ],
        ],
        [[{ id: 'neg', name: 'neg', startTime: 10, duration: -5 }]],
      ],
    },
    {
      export: 'serviceColor',
      calls: [['auth'], [''], ['api-gw'], ['redis'], ['warehouse'], ['same'], ['same']],
    },
    {
      export: 'formatDurationLabel',
      calls: [
        [0.25],
        [0],
        [125],
        [999.99],
        [1000],
        [2500],
        [-1],
        [Number.NaN],
        [Number.POSITIVE_INFINITY],
      ],
    },
    {
      export: 'formatDurationParts',
      calls: [
        [0.25, 'en'],
        [0, 'en'],
        [125, 'en'],
        [999.99, 'en'],
        [1000, 'en'],
        [2500, 'en'],
        [-1, 'en'],
        [Number.NaN, 'en'],
        [2.5, 'de'],
        [0.625, 'de'],
      ],
    },
    {
      export: 'translateDuration',
      calls: [
        [0.25, 'en', translateDurationMarker],
        [125, 'en', translateDurationMarker],
        [1000, 'en', translateDurationMarker],
        [-1, 'en', translateDurationMarker],
        [2.5, 'de', translateDurationMarker],
      ],
    },
  ],
}
