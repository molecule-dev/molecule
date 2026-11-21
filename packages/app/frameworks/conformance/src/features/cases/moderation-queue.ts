/**
 * `@molecule/app-moderation-queue-react` cases: the loading / empty / list
 * branches, every kind and severity, the row fields, the per-row and bulk
 * action buttons (present only with their handlers), the bulk selection
 * (row checkboxes, select-all with its indeterminate state, the count label)
 * and the prop changes between the branches.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A node-valued prop: a paragraph carrying the preview text. */
const preview = (id: string, text: string): Record<string, unknown> => ({
  $nodes: [{ tag: 'p', attrs: { 'data-testid': `p-${id}` }, children: [text] }],
})

/** Two rows: a comment with every field and an image without the reporter. */
const rows = [
  {
    id: 'r-1',
    kind: 'comment',
    preview: preview('r-1', 'Flagged comment text'),
    reason: 'Hate speech',
    reportedBy: {
      $nodes: [{ tag: 'strong', attrs: { 'data-testid': 'by-r-1' }, children: ['@alice'] }],
    },
    reportedAt: '2m ago',
    severity: 'high',
  },
  {
    id: 'r-2',
    kind: 'image',
    preview: preview('r-2', 'Flagged image alt'),
    reason: { $nodes: [{ tag: 'em', children: ['NSFW'] }] },
    reportedAt: '5m ago',
    severity: 'medium',
  },
]

/** One row with every field present (kind `post`, severity `low`). */
const singleRow = [
  {
    id: 's-1',
    kind: 'post',
    preview: preview('s-1', 'Flagged post body'),
    reason: 'Spam',
    reportedBy: '@bob',
    reportedAt: '12m ago',
    severity: 'low',
  },
]

/** One row per `ModerationItemKind`, with every severity and the omitted fields. */
const everyKind = [
  {
    id: 'k-post',
    kind: 'post',
    preview: preview('k-post', 'Post body'),
    reason: 'Spam',
    reportedBy: '@alice',
    reportedAt: '2m ago',
    severity: 'low',
  },
  {
    id: 'k-comment',
    kind: 'comment',
    preview: preview('k-comment', 'Comment text'),
    reason: 'Hate speech',
    reportedBy: '@bob',
    reportedAt: '5m ago',
    severity: 'medium',
  },
  {
    id: 'k-image',
    kind: 'image',
    preview: preview('k-image', 'Image alt'),
    reason: 'NSFW',
    reportedBy: '@carol',
    reportedAt: '9m ago',
    severity: 'high',
  },
  {
    id: 'k-message',
    kind: 'message',
    preview: preview('k-message', 'Direct message'),
    reason: 'Harassment',
    reportedAt: '12m ago',
  },
  {
    id: 'k-profile',
    kind: 'profile',
    preview: preview('k-profile', 'Profile bio'),
    reason: 'Impersonation',
    reportedAt: '15m ago',
  },
]

/** Every action handler the component accepts. */
const allCallbacks = ['onApprove', 'onReject', 'onEscalate', 'onMute', 'onBulkAction']

/** The two handlers every row needs. */
const rowCallbacks = ['onApprove', 'onReject']

/** The bulk toolbar's approve button. */
const BULK_APPROVE = '[data-mol-id="moderation-queue-bulk-approve"]'

/** The bulk toolbar's reject button. */
const BULK_REJECT = '[data-mol-id="moderation-queue-bulk-reject"]'

/** The select-all checkbox. */
const SELECT_ALL = '[data-mol-id="moderation-queue-select-all"]'

/**
 * The row checkbox of one row.
 *
 * @param id - The item id.
 * @returns A CSS selector for that row's checkbox.
 */
const rowCheckbox = (id: string): string =>
  `[data-mol-row-id="${id}"] [data-mol-id="moderation-queue-row-select"]`

/** `@molecule/app-moderation-queue-react`. */
export const moderationQueueFeature: FeatureCases = {
  package: '@molecule/app-moderation-queue-react',
  families: [
    {
      component: 'ModerationQueue',
      cases: [
        // The first case also runs again with a pseudo-locale switch
        // ("…, then a locale switch"): the loading text must follow it.
        {
          name: 'loading state',
          props: { items: [], loading: true },
          callbacks: rowCallbacks,
        },
        {
          name: 'loading with items, an id and classes',
          props: { items: singleRow, loading: true, className: 'parity-token' },
          callbacks: rowCallbacks,
        },
        { name: 'empty state', props: { items: [] } },
        {
          name: 'empty state with classes',
          props: { items: [], className: 'parity-token' },
        },
        {
          name: 'custom empty state',
          props: {
            items: [],
            emptyState: {
              $nodes: [
                { tag: 'span', attrs: { 'data-testid': 'custom-empty' }, children: ['Inbox zero'] },
              ],
            },
          },
        },
        {
          name: 'a single row with every field',
          props: { items: singleRow },
          callbacks: rowCallbacks,
        },
        {
          name: 'rows for every kind and severity',
          props: { items: everyKind },
          callbacks: rowCallbacks,
        },
        {
          name: 'row actions without escalate and mute',
          props: { items: rows },
          callbacks: rowCallbacks,
        },
        {
          name: 'row actions with escalate and mute',
          props: { items: rows },
          callbacks: ['onApprove', 'onReject', 'onEscalate', 'onMute'],
        },
        {
          name: 'className passthrough',
          props: { items: rows, className: 'parity-token' },
          callbacks: rowCallbacks,
        },
        {
          name: 'bulk actions without onBulkAction',
          props: { items: rows },
          callbacks: ['onApprove', 'onReject', 'onEscalate', 'onMute'],
        },
        {
          name: 'bulk actions with every handler',
          props: { items: rows },
          callbacks: allCallbacks,
        },
        {
          name: 'bulk actions with only an escalate handler',
          props: { items: rows },
          callbacks: ['onApprove', 'onReject', 'onEscalate', 'onBulkAction'],
        },
        {
          name: 'approving a row calls onApprove',
          props: { items: rows },
          callbacks: allCallbacks,
          interactions: [
            {
              type: 'click',
              selector: '[data-mol-row-id="r-2"] [data-mol-id="moderation-queue-row-approve"]',
            },
          ],
        },
        {
          name: 'rejecting a row calls onReject',
          props: { items: rows },
          callbacks: allCallbacks,
          interactions: [
            {
              type: 'click',
              selector: '[data-mol-row-id="r-1"] [data-mol-id="moderation-queue-row-reject"]',
            },
          ],
        },
        {
          name: 'escalating and muting rows call their handlers',
          props: { items: rows },
          callbacks: allCallbacks,
          interactions: [
            {
              type: 'click',
              selector: '[data-mol-row-id="r-1"] [data-mol-id="moderation-queue-row-escalate"]',
            },
            {
              type: 'click',
              selector: '[data-mol-row-id="r-2"] [data-mol-id="moderation-queue-row-mute"]',
            },
          ],
        },
        {
          name: 'checking a row selects it',
          props: { items: rows },
          callbacks: allCallbacks,
          interactions: [{ type: 'check', selector: rowCheckbox('r-1'), checked: true }],
        },
        {
          name: 'checking two rows shows the count',
          props: { items: rows },
          callbacks: allCallbacks,
          interactions: [
            { type: 'check', selector: rowCheckbox('r-1'), checked: true },
            { type: 'check', selector: rowCheckbox('r-2'), checked: true },
          ],
        },
        {
          name: 'unchecking a row removes it from the count',
          props: { items: rows },
          callbacks: allCallbacks,
          interactions: [
            { type: 'check', selector: rowCheckbox('r-1'), checked: true },
            { type: 'check', selector: rowCheckbox('r-1'), checked: false },
          ],
        },
        {
          name: 'select-all selects every row and a second click clears',
          props: { items: rows },
          callbacks: allCallbacks,
          interactions: [
            { type: 'check', selector: SELECT_ALL, checked: true },
            { type: 'check', selector: SELECT_ALL, checked: false },
          ],
        },
        {
          name: 'a partial selection makes select-all indeterminate',
          props: { items: everyKind },
          callbacks: allCallbacks,
          interactions: [{ type: 'check', selector: rowCheckbox('k-post'), checked: true }],
        },
        {
          name: 'a partial selection clears when the rest are selected',
          props: { items: rows },
          callbacks: allCallbacks,
          interactions: [
            { type: 'check', selector: rowCheckbox('r-1'), checked: true },
            { type: 'check', selector: rowCheckbox('r-2'), checked: true },
            { type: 'check', selector: rowCheckbox('r-2'), checked: false },
          ],
        },
        {
          name: 'bulk approve applies to the selected ids',
          props: { items: rows },
          callbacks: allCallbacks,
          interactions: [
            { type: 'check', selector: rowCheckbox('r-1'), checked: true },
            { type: 'check', selector: rowCheckbox('r-2'), checked: true },
            { type: 'click', selector: BULK_APPROVE },
          ],
        },
        {
          name: 'bulk reject applies to the selected ids',
          props: { items: rows },
          callbacks: allCallbacks,
          interactions: [
            { type: 'check', selector: rowCheckbox('r-2'), checked: true },
            { type: 'click', selector: BULK_REJECT },
          ],
        },
        {
          name: 'bulk escalate applies to the selected ids',
          props: { items: rows },
          callbacks: allCallbacks,
          interactions: [
            { type: 'check', selector: rowCheckbox('r-1'), checked: true },
            { type: 'click', selector: '[data-mol-id="moderation-queue-bulk-escalate"]' },
          ],
        },
        {
          name: 'bulk mute applies to the selected ids',
          props: { items: rows },
          callbacks: allCallbacks,
          interactions: [
            { type: 'check', selector: rowCheckbox('r-2'), checked: true },
            { type: 'click', selector: '[data-mol-id="moderation-queue-bulk-mute"]' },
          ],
        },
        {
          name: 'a bulk action with nothing selected makes no call',
          props: { items: rows },
          callbacks: allCallbacks,
          interactions: [{ type: 'click', selector: BULK_APPROVE }],
        },
        {
          name: 'a props change switches to the loading state',
          props: { items: rows },
          callbacks: allCallbacks,
          interactions: [{ type: 'props', props: { loading: true } }],
        },
        {
          name: 'a props change back from loading shows the rows',
          props: { items: rows, loading: true },
          callbacks: allCallbacks,
          interactions: [{ type: 'props', props: { loading: false } }],
        },
        {
          name: 'an empty queue gains items',
          props: { items: [] },
          callbacks: rowCallbacks,
          interactions: [{ type: 'props', props: { items: singleRow } }],
        },
        {
          name: 'an emptied queue shows the empty state',
          props: { items: singleRow },
          callbacks: rowCallbacks,
          interactions: [{ type: 'props', props: { items: [] } }],
        },
        {
          name: 'a props change replaces the rows',
          props: { items: singleRow },
          callbacks: rowCallbacks,
          interactions: [{ type: 'props', props: { items: rows } }],
        },
        {
          name: 'className appears on a later render',
          props: { items: rows },
          callbacks: rowCallbacks,
          interactions: [{ type: 'props', props: { className: 'parity-token' } }],
        },
        {
          name: 'the empty state is replaced by a custom node',
          props: { items: [] },
          interactions: [
            {
              type: 'props',
              props: {
                emptyState: {
                  $nodes: [{ tag: 'b', attrs: { 'data-late': '' }, children: ['Nothing here'] }],
                },
              },
            },
          ],
        },
      ],
      keyedLists: [
        {
          prop: 'items',
          selector: '[data-mol-id="moderation-queue-row"]',
          caseName: 'rows for every kind and severity',
        },
      ],
    },
  ],
  values: [
    {
      export: 'severityColor',
      calls: [['low'], ['medium'], ['high'], [undefined]],
    },
  ],
}
