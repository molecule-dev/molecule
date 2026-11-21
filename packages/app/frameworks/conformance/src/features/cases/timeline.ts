/**
 * `@molecule/app-timeline-react` cases: the vertical event list, the event row,
 * the rail (marker + connector) and the date separator.
 *
 * Every runtime export of the React package is covered: `Timeline`,
 * `TimelineEvent`, `TimelineRail` and `TimelineDate`. The package reads no app
 * services, so every case mounts with the UI providers only. Its single
 * callback prop, `Timeline.renderDateSeparator`, is a render function: the
 * cases below exercise it through `{ $fn }` nodes at every event position (the
 * `{0.id}` / `{1.id}` placeholders read the event and its predecessor) and once
 * returning nothing.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Three events with a body on the middle one, as the React package's README shows. */
const events = [
  { id: '1', timestamp: '2 hours ago', title: 'Order placed' },
  { id: '2', timestamp: 'Yesterday', title: 'Payment confirmed', body: 'Visa ending 4242' },
  { id: '3', timestamp: 'Mar 12', title: 'Item shipped' },
]

/** The smallest event: id, timestamp and title only — no body and no marker. */
const bareEvent = { id: 'a', timestamp: 'ts-a', title: 'title-a' }

/** An empty-state node, rendered as React's bare branch. */
const emptyStateNode = {
  $nodes: [{ tag: 'p', attrs: { 'data-empty': '' }, children: ['No activity yet'] }],
}

/** One event whose marker, timestamp, title and body are all nodes. */
const nodeEvent = {
  id: 'n',
  marker: { $nodes: [{ tag: 'i', attrs: { 'data-marker': '' } }] },
  timestamp: { $nodes: [{ tag: 'time', children: ['09:30'] }] },
  title: { $nodes: [{ tag: 'strong', children: ['Node title'] }] },
  body: { $nodes: [{ tag: 'em', children: ['Node body'] }] },
}

/** `@molecule/app-timeline-react`. */
export const timelineFeature: FeatureCases = {
  package: '@molecule/app-timeline-react',
  families: [
    {
      component: 'Timeline',
      cases: [
        { name: 'defaults: three events', props: { events } },
        { name: 'a single event', props: { events: [events[0]] } },
        { name: 'no events and no empty state', props: { events: [] } },
        {
          name: 'no events with a node empty state',
          props: { events: [], emptyState: emptyStateNode },
        },
        {
          name: 'no events with a text empty state',
          props: { events: [], emptyState: 'No activity yet' },
        },
        {
          name: 'an empty state is ignored while events exist',
          props: { events, emptyState: emptyStateNode },
        },
        {
          name: 'node values for marker, timestamp, title and body',
          props: { events: [nodeEvent] },
        },
        { name: 'a className', props: { events, className: 'parity-token' } },
        {
          name: 'date separators from a render function',
          props: {
            events,
            renderDateSeparator: {
              $fn: 'renderDateSeparator',
              nodes: [
                {
                  tag: 'hr',
                  attrs: { 'data-sep': '{0.id}', 'data-prev': '{1.id}' },
                },
              ],
            },
          },
        },
        {
          name: 'a render function returning nothing',
          props: { events, renderDateSeparator: { $fn: 'renderDateSeparator', returns: null } },
        },
        {
          name: 'events change',
          props: { events },
          interactions: [
            {
              type: 'props',
              props: {
                events: [
                  { id: '1', timestamp: '3 hours ago', title: 'Order placed' },
                  { id: '2', timestamp: 'Yesterday', title: 'Payment confirmed' },
                ],
              },
            },
          ],
        },
        {
          name: 'events become empty',
          props: { events },
          interactions: [{ type: 'props', props: { events: [] } }],
        },
        {
          name: 'an empty state appears with the empty list',
          props: { events },
          interactions: [
            { type: 'props', props: { events: [] } },
            { type: 'props', props: { emptyState: emptyStateNode } },
          ],
        },
        {
          name: 'the className changes',
          props: { events, className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
      ],
      keyedLists: [
        {
          prop: 'events',
          selector: 'div:not([class])',
          caseName: 'defaults: three events',
        },
      ],
    },
    {
      component: 'TimelineEvent',
      cases: [
        {
          name: 'timestamp, title and body',
          props: { event: { ...bareEvent, body: 'body-a' } },
        },
        { name: 'no body', props: { event: bareEvent } },
        { name: 'the connector renders by default', props: { event: bareEvent } },
        { name: 'not the last event', props: { event: bareEvent, isLast: false } },
        { name: 'the last event', props: { event: bareEvent, isLast: true } },
        {
          name: 'a custom marker',
          props: {
            event: { ...bareEvent, marker: { $nodes: [{ tag: 'span', attrs: { 'data-m': '' } }] } },
          },
        },
        {
          name: 'node values for marker, timestamp, title and body',
          props: { event: nodeEvent },
        },
        { name: 'a className', props: { event: bareEvent, className: 'evt-cls' } },
        {
          name: 'the body is added later',
          props: { event: bareEvent },
          interactions: [{ type: 'props', props: { event: { ...bareEvent, body: 'body-b' } } }],
        },
        {
          name: 'the body is removed later',
          props: { event: { ...bareEvent, body: 'body-a' } },
          interactions: [{ type: 'props', props: { event: bareEvent } }],
        },
        {
          name: 'the event becomes the last one',
          props: { event: bareEvent, isLast: false },
          interactions: [{ type: 'props', props: { isLast: true } }],
        },
        {
          name: 'the marker falls back to the default dot',
          props: {
            event: { ...bareEvent, marker: { $nodes: [{ tag: 'b', children: ['!'] }] } },
          },
          interactions: [{ type: 'props', props: { event: bareEvent } }],
        },
      ],
    },
    {
      component: 'TimelineRail',
      cases: [
        { name: 'the default bullet, with the connector', props: {} },
        { name: 'no connector', props: { connector: false } },
        {
          name: 'a custom marker',
          props: { marker: { $nodes: [{ tag: 'i', attrs: { 'data-marker': '' } }] } },
        },
        { name: 'a text marker', props: { marker: 'x' } },
        { name: 'a className', props: { className: 'rail-cls' } },
        {
          name: 'the connector is removed later',
          props: { connector: true },
          interactions: [{ type: 'props', props: { connector: false } }],
        },
        {
          name: 'the connector comes back later',
          props: { connector: false },
          interactions: [{ type: 'props', props: { connector: true } }],
        },
        {
          name: 'the marker is removed later',
          props: { marker: { $nodes: [{ tag: 'i', attrs: { 'data-marker': '' } }] } },
          interactions: [{ type: 'props', props: { marker: undefined } }],
        },
      ],
    },
    {
      component: 'TimelineDate',
      cases: [
        { name: 'its children', children: ['Yesterday'] },
        { name: 'a node child', children: [{ tag: 'strong', children: ['Today'] }] },
        { name: 'a className', children: ['Today'], props: { className: 'date-cls' } },
        {
          name: 'the className changes',
          children: ['Today'],
          props: { className: 'date-cls' },
          interactions: [{ type: 'props', props: { className: 'date-other' } }],
        },
      ],
    },
  ],
}
