/**
 * `@molecule/app-log-viewer-react` cases: the structured log-row viewer —
 * one expandable `<details>` row per entry (timestamp + colored severity badge
 * + optional service label + single-line message, expanding to a trace id and
 * a JSON-formatted structured-data panel), the empty-state branch, and the
 * `onToggle` notification each expansion/collapse makes.
 *
 * `LogViewer` is the package's only runtime export (`LogEntry`, `LogLevel` and
 * `LogViewerProps` are types). Expansion state is internal and keyed by
 * `entry.id`; `onToggle(id, expanded)` is notification-only.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The six severity levels, lowest first — each renders its fixed badge color. */
const LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const

/** A plain entry with every optional field absent. */
const minimal = { id: 'min', timestamp: '00:00', level: 'debug', message: 'm' }

/** A text entry carrying the optional service label. */
const info = {
  id: '1',
  timestamp: '10:00',
  level: 'info',
  message: 'started up',
  service: 'auth-api',
}

/** A text entry carrying the optional trace id and structured data. */
const errorEntry = {
  id: '2',
  timestamp: '10:01',
  level: 'error',
  message: 'boom',
  traceId: 'trace-xyz',
  data: { code: 500 },
}

/** A text entry with every optional field set, including both badges. */
const full = {
  id: '3',
  timestamp: '10:02',
  level: 'warn',
  message: 'slow query',
  service: 'db',
  traceId: 'tr-42',
  data: { query: 'select 1', ms: 1200 },
}

/** The empty state, the way a caller fills it. */
const emptyState = [{ tag: 'p', attrs: { 'data-empty': '' }, children: ['No logs'] }]

/** `@molecule/app-log-viewer-react`. */
export const logViewerFeature: FeatureCases = {
  package: '@molecule/app-log-viewer-react',
  families: [
    {
      component: 'LogViewer',
      keyedLists: [{ prop: 'entries', selector: 'details', caseName: 'two entries' }],
      cases: [
        { name: 'no entries and no empty state', props: { entries: [] } },
        {
          name: 'no entries with an empty state',
          props: { entries: [] },
          slots: { emptyState },
        },
        { name: 'one entry', props: { entries: [info] } },
        { name: 'two entries', props: { entries: [info, errorEntry] } },
        {
          name: 'every severity level',
          props: {
            entries: LEVELS.map((level, index) => ({
              id: `lvl-${level}`,
              timestamp: `10:0${index}`,
              level,
              message: `${level} message`,
            })),
          },
        },
        { name: 'service label and trace id', props: { entries: [full] } },
        { name: 'no optional fields', props: { entries: [minimal] } },
        {
          name: 'string structured data',
          props: { entries: [{ ...minimal, data: 'raw text payload' }] },
        },
        {
          name: 'multiline string structured data',
          props: { entries: [{ ...minimal, data: 'line one\nline two' }] },
        },
        {
          name: 'object structured data',
          props: {
            entries: [
              { ...minimal, data: { code: 'ECONNREFUSED', nested: { a: 1 }, list: [1, 2] } },
            ],
          },
        },
        {
          name: 'array structured data',
          props: { entries: [{ ...minimal, data: [1, 'two', { three: 3 }] }] },
        },
        { name: 'null structured data', props: { entries: [{ ...minimal, data: null }] } },
        { name: 'number structured data', props: { entries: [{ ...minimal, data: 42 }] } },
        { name: 'false structured data', props: { entries: [{ ...minimal, data: false }] } },
        { name: 'empty string structured data', props: { entries: [{ ...minimal, data: '' }] } },
        {
          name: 'node-valued entry fields',
          props: {
            entries: [
              {
                id: 'node',
                timestamp: { $nodes: [{ tag: 'em', children: ['10:03'] }] },
                level: 'error',
                message: { $nodes: [{ tag: 'strong', children: ['fatal '] }, 'crash'] },
                service: { $nodes: [{ tag: 'code', children: ['worker'] }] },
                traceId: { $nodes: [{ tag: 's', children: ['tr-9'] }] },
                data: { ok: false },
              },
            ],
          },
        },
        { name: 'className passthrough', props: { entries: [info], className: 'parity-token' } },
        {
          name: 'an empty state is ignored while there are entries',
          props: { entries: [info] },
          slots: { emptyState },
        },
        {
          name: 'clicking a summary expands the row and calls onToggle',
          props: { entries: [info] },
          callbacks: ['onToggle'],
          interactions: [{ type: 'click', selector: 'summary' }],
        },
        {
          name: 'clicking a summary twice collapses the row',
          props: { entries: [info] },
          callbacks: ['onToggle'],
          interactions: [
            { type: 'click', selector: 'summary' },
            { type: 'click', selector: 'summary' },
          ],
        },
        {
          name: 'clicking a second row leaves the first closed',
          props: { entries: [info, errorEntry] },
          callbacks: ['onToggle'],
          interactions: [{ type: 'click', selector: 'details:nth-of-type(2) > summary' }],
        },
        {
          name: 'expanding two rows',
          props: { entries: [info, errorEntry] },
          callbacks: ['onToggle'],
          interactions: [
            { type: 'click', selector: 'details:nth-of-type(1) > summary' },
            { type: 'click', selector: 'details:nth-of-type(2) > summary' },
          ],
        },
        {
          name: 'a props change replaces the entries',
          props: { entries: [info] },
          callbacks: ['onToggle'],
          interactions: [{ type: 'props', props: { entries: [errorEntry] } }],
        },
        {
          name: 'a props change adds an entry',
          props: { entries: [info] },
          interactions: [{ type: 'props', props: { entries: [info, errorEntry] } }],
        },
        {
          name: 'a data change reformats the panel',
          props: { entries: [errorEntry] },
          interactions: [
            { type: 'props', props: { entries: [{ ...errorEntry, data: { code: 503 } }] } },
          ],
        },
        {
          name: 'a service label appears on a props change',
          props: { entries: [minimal] },
          interactions: [{ type: 'props', props: { entries: [{ ...minimal, service: 'queue' }] } }],
        },
        {
          name: 'an empty state arrives on a props change',
          props: { entries: [] },
          interactions: [{ type: 'props', props: { emptyState: { $nodes: emptyState } } }],
        },
        {
          name: 'entries empty out and the empty state renders',
          props: { entries: [info] },
          slots: { emptyState },
          interactions: [{ type: 'props', props: { entries: [] } }],
        },
        {
          name: 'className changes',
          props: { entries: [info] },
          interactions: [{ type: 'props', props: { className: 'parity-token' } }],
        },
        {
          name: 'an expanded row stays open through a className change',
          props: { entries: [info] },
          callbacks: ['onToggle'],
          interactions: [
            { type: 'click', selector: 'summary' },
            { type: 'props', props: { className: 'parity-token' } },
          ],
        },
        {
          name: 'an expanded row disappears with its entry',
          props: { entries: [info, errorEntry] },
          callbacks: ['onToggle'],
          interactions: [
            { type: 'click', selector: 'details:nth-of-type(1) > summary' },
            { type: 'props', props: { entries: [errorEntry] } },
          ],
        },
      ],
    },
  ],
}
