/**
 * `@molecule/app-notification-center-react` cases: the notification panel —
 * title (prop, node or slot), mark-all-read action, error banner with its
 * retry action, item list with per-item leading / title / body / timestamp and
 * unread dot + tint, the empty-state branch (default, node or slot), the
 * "View all" footer, and every callback.
 *
 * `NotificationCenter` is the package's only runtime export (`NotificationItem`
 * and `NotificationCenterProps` are types). `onMarkAllRead`, `onViewAll` and
 * `onRetry` are DOM click handlers in React, so each receives the click event;
 * an item's `onClick` does too. A clickable item row is a `role="button"`
 * wrapper inside its `<li>` (a `li` cannot take button semantics), and Enter /
 * Space activate it — the keyboard path calls `onClick` with no arguments.
 * Every translated string comes from the
 * package's own i18n keys, so the derived locale-switch case re-renders the
 * default title under the pseudo-locale.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const items = [
  { id: '1', title: 'New comment', body: 'on your post', timestamp: '2m', read: false },
  { id: '2', title: 'Build passed', read: true },
]

const readItems = [
  { id: '1', title: 'New comment', body: 'on your post', read: true },
  { id: '2', title: 'Build passed', read: true },
]

const leadingNode = [{ tag: 'span', attrs: { 'data-leading': '' }, children: ['★'] }]
const titleNode = [{ tag: 'strong', children: ['Alerts'] }]
const emptyNode = [{ tag: 'p', attrs: { 'data-empty': '' }, children: ['All caught up'] }]
const bodyNode = [{ tag: 'em', children: ['on your post'] }]
const timestampNode = [{ tag: 'time', children: ['09:30'] }]

/** The mark-all-read action (the header's only button). */
const markAllSelector = 'header button'
/** The "View all" action (the footer's only button). */
const viewAllSelector = 'footer button'
/** The error banner's retry action. */
const retrySelector = 'button[data-mol-id="notification-center-retry"]'
/**
 * The first item row's surface: the `<li>` cannot take button semantics, so
 * the row's click and key handlers live on its wrapper `<div>` (a
 * `role="button"` while the item is clickable).
 */
const firstItemSelector = 'ul > li:first-child > div'

/** `@molecule/app-notification-center-react`. */
export const notificationCenterFeature: FeatureCases = {
  package: '@molecule/app-notification-center-react',
  families: [
    {
      component: 'NotificationCenter',
      cases: [
        // The first case also runs again with a pseudo-locale switch: the
        // default title must follow the locale.
        { name: 'defaults with items', props: { items } },
        {
          name: 'custom title text',
          props: { items, title: 'Alerts' },
        },
        {
          name: 'title as a node',
          props: { items, title: { $nodes: titleNode } },
        },
        {
          name: 'title as a slot',
          props: { items },
          slots: { title: titleNode },
        },
        {
          name: 'no items renders the default empty message',
          props: { items: [] },
        },
        {
          name: 'custom empty state node',
          props: { items: [], emptyState: { $nodes: emptyNode } },
        },
        {
          name: 'empty state as a slot',
          props: { items: [] },
          slots: { emptyState: emptyNode },
        },
        {
          name: 'items win over an empty state',
          props: { items, emptyState: { $nodes: emptyNode } },
        },
        {
          name: 'all read items have no dot and no tint',
          props: { items: readItems },
        },
        {
          name: 'item leading, body and timestamp as nodes',
          props: {
            items: [
              {
                id: '1',
                title: 'New comment',
                leading: { $nodes: leadingNode },
                body: { $nodes: bodyNode },
                timestamp: { $nodes: timestampNode },
                read: false,
              },
            ],
          },
        },
        {
          name: 'an item with no optional fields',
          props: { items: [{ id: 'solo', title: 'One thing', read: true }] },
        },
        {
          name: 'mark all read with items',
          props: { items },
          callbacks: ['onMarkAllRead'],
        },
        {
          name: 'no mark all read without a handler',
          props: { items },
        },
        {
          name: 'no mark all read without items',
          props: { items: [] },
          callbacks: ['onMarkAllRead'],
        },
        {
          name: 'view all with items',
          props: { items },
          callbacks: ['onViewAll'],
        },
        {
          name: 'no view all without a handler',
          props: { items },
        },
        {
          name: 'no view all without items',
          props: { items: [] },
          callbacks: ['onViewAll'],
        },
        {
          name: 'clicking mark all read calls onMarkAllRead',
          props: { items },
          callbacks: ['onMarkAllRead'],
          interactions: [{ type: 'click', selector: markAllSelector }],
        },
        {
          name: 'clicking view all calls onViewAll',
          props: { items },
          callbacks: ['onViewAll'],
          interactions: [{ type: 'click', selector: viewAllSelector }],
        },
        {
          name: 'clicking an item calls its onClick',
          props: {
            items: [{ id: '1', title: 'Click me', onClick: { $callback: 'onItemClick' } }],
          },
          interactions: [{ type: 'click', selector: firstItemSelector }],
        },
        {
          name: 'clicking an item without onClick calls nothing',
          props: { items: [{ id: '1', title: 'Not clickable', read: true }] },
          interactions: [{ type: 'click', selector: firstItemSelector }],
        },
        {
          name: 'pressing Enter on a clickable item calls its onClick',
          props: {
            items: [{ id: '1', title: 'Key me', onClick: { $callback: 'onItemClick' } }],
          },
          interactions: [{ type: 'keydown', selector: firstItemSelector, key: 'Enter' }],
        },
        {
          name: 'pressing Space on a clickable item calls its onClick',
          props: {
            items: [{ id: '1', title: 'Key me', onClick: { $callback: 'onItemClick' } }],
          },
          interactions: [{ type: 'keydown', selector: firstItemSelector, key: ' ' }],
        },
        {
          name: 'keyboard on an item without onClick calls nothing',
          props: { items: [{ id: '1', title: 'Not clickable', read: true }] },
          interactions: [{ type: 'keydown', selector: firstItemSelector, key: 'Enter' }],
        },
        {
          name: 'an error banner above the populated list',
          props: { items, lastError: new Error('Network error') },
        },
        {
          name: 'an error banner above the empty state',
          props: { items: [], lastError: new Error('boom') },
        },
        {
          name: 'clicking retry calls onRetry',
          props: { items, lastError: new Error('Network error') },
          callbacks: ['onRetry'],
          interactions: [{ type: 'click', selector: retrySelector }],
        },
        {
          name: 'className passthrough',
          props: { items, className: 'parity-token' },
        },
        {
          name: 'everything at once',
          props: {
            items,
            title: 'Alerts',
            className: 'parity-token',
            lastError: new Error('Network error'),
          },
          callbacks: ['onMarkAllRead', 'onViewAll', 'onRetry'],
          interactions: [
            { type: 'click', selector: markAllSelector },
            { type: 'click', selector: viewAllSelector },
            { type: 'click', selector: retrySelector },
          ],
        },
        {
          name: 'prop changes',
          props: { items },
          callbacks: ['onMarkAllRead', 'onViewAll'],
          interactions: [
            { type: 'props', props: { title: 'Alerts' } },
            { type: 'props', props: { items: [] } },
            { type: 'props', props: { items, lastError: new Error('later') } },
            { type: 'props', props: { lastError: null, className: 'parity-other' } },
          ],
        },
        {
          name: 'handlers appear after mount',
          props: { items },
          interactions: [
            {
              type: 'props',
              props: { onMarkAllRead: { $callback: 'onMarkAllRead' } },
            },
            { type: 'props', props: { onViewAll: { $callback: 'onViewAll' } } },
            { type: 'click', selector: markAllSelector },
            { type: 'click', selector: viewAllSelector },
          ],
        },
        {
          name: 'the empty state appears and goes away',
          props: { items },
          interactions: [
            { type: 'props', props: { items: [] } },
            { type: 'props', props: { items } },
          ],
        },
      ],
      keyedLists: [{ prop: 'items', selector: 'li', caseName: 'defaults with items' }],
    },
  ],
}
