/**
 * `@molecule/app-activity-timeline-react` cases: the vertical timeline, its
 * single row, and its dot marker.
 *
 * Every runtime export of the React package is covered: `ActivityTimeline`,
 * `ActivityTimelineRow` and `ActivityTimelineDot`. The package has no callback
 * props and reads no app service, so its branches are chosen by props alone —
 * the interactions below change the event list, the tone map, the header/footer
 * slots and `className`. Every node-valued field (`title`, `description`,
 * `meta`, `footer`, `header`) is exercised as plain text and as a rendered
 * node, and `rowWrapper` — a render function — as a `{ $fn }` value whose nodes
 * interpolate the event it is called with. The rows are keyed by `event.id`, so
 * `keyedLists` proves that a re-passed or re-ordered event list keeps each
 * row's DOM: the rows are the rail's `<div>` siblings
 * (`span[aria-hidden="true"] ~ div`), whichever framework renders them.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The events a timeline usually shows: one per tone branch (mapped, default). */
const events = [
  { id: '1', kind: 'call', title: 'Called Jane', description: 'Left a voicemail', meta: '2h ago' },
  { id: '2', kind: 'email', title: 'Emailed Bob', meta: 'Yesterday' },
  { id: '3', kind: 'unknown', title: 'Signed contract' },
]

/** Visual treatments per event kind: one with consumer classes, one without. */
const tones = {
  call: { icon: 'call', dotClass: 'consumer-dot', iconClass: 'consumer-icon' },
  email: { icon: 'mail' },
}

/** The tone a row renders on its own. */
const tone = { icon: 'call' }

/** `@molecule/app-activity-timeline-react`. */
export const activityTimelineFeature: FeatureCases = {
  package: '@molecule/app-activity-timeline-react',
  families: [
    {
      component: 'ActivityTimeline',
      cases: [
        { name: 'no events', props: { events: [] } },
        { name: 'a single event', props: { events: [events[0]!], toneByKind: tones } },
        { name: 'three events with no tone map', props: { events } },
        {
          name: 'a tone map with a mapped and an unmapped kind',
          props: { events, toneByKind: tones },
        },
        {
          name: 'a default tone for kinds the map omits',
          props: { events, toneByKind: tones, defaultTone: { icon: 'circle' } },
        },
        {
          name: 'a header slot',
          props: { events: [events[0]!], toneByKind: tones },
          slots: { header: [{ tag: 'header', children: ['Today'] }] },
        },
        {
          name: 'a text header',
          props: { events: [events[0]!] },
          slots: { header: ['Today'] },
        },
        {
          name: 'a footer slot',
          props: { events: [events[0]!], toneByKind: tones },
          slots: {
            footer: [{ tag: 'button', attrs: { type: 'button' }, children: ['Load more'] }],
          },
        },
        {
          name: 'a header and a footer together',
          props: { events, toneByKind: tones },
          slots: {
            header: [{ tag: 'header', children: ['This week'] }],
            footer: [{ tag: 'small', children: ['3 events'] }],
          },
        },
        {
          name: 'node-valued titles, descriptions and meta',
          props: {
            events: [
              {
                id: 'n1',
                kind: 'call',
                title: { $nodes: [{ tag: 'strong', children: ['Nia called'] }] },
                description: { $nodes: [{ tag: 'em', children: ['voicemail left'] }] },
                meta: { $nodes: [{ tag: 'time', children: ['09:30'] }] },
                footer: {
                  $nodes: [{ tag: 'span', attrs: { 'data-chip': '' }, children: ['vip'] }],
                },
              },
              {
                id: 'n2',
                kind: 'email',
                title: 'Plain title',
                description: 'Plain description',
                meta: 'Mar 5',
              },
            ],
          },
        },
        {
          name: 'a row wrapper wraps every row',
          props: {
            events: [events[0]!, events[1]!],
            toneByKind: tones,
            rowWrapper: {
              $fn: 'rowWrapper',
              nodes: [
                {
                  tag: 'a',
                  attrs: { href: '/activities/{0.id}' },
                  children: ['{0.kind}'],
                },
              ],
            },
          },
        },
        {
          name: 'className passthrough',
          props: { events: [events[0]!], toneByKind: tones, className: 'parity-token' },
        },
        {
          name: 'reserved event fields are not rendered',
          props: {
            events: [
              {
                id: 'r1',
                kind: 'call',
                title: 'Called Jane',
                occurredAt: '2026-03-05T09:30:00Z',
                href: '/activities/r1',
              },
            ],
            toneByKind: tones,
          },
        },
        {
          name: 'the events change',
          props: { events: [events[0]!], toneByKind: tones },
          interactions: [{ type: 'props', props: { events } }],
        },
        {
          name: 'the events are emptied',
          props: { events, toneByKind: tones },
          interactions: [{ type: 'props', props: { events: [] } }],
        },
        {
          name: 'a header appears',
          props: { events: [events[0]!], toneByKind: tones },
          interactions: [{ type: 'props', props: { header: 'Today' } }],
        },
        {
          name: 'a footer appears',
          props: { events: [events[0]!] },
          interactions: [{ type: 'props', props: { footer: '1 event' } }],
        },
        {
          name: 'the tone map changes',
          props: { events, toneByKind: tones },
          interactions: [{ type: 'props', props: { toneByKind: { call: { icon: 'phone' } } } }],
        },
        {
          name: 'the className is removed',
          props: { events: [events[0]!], className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: undefined } }],
        },
      ],
      keyedLists: [
        {
          prop: 'events',
          selector: 'span[aria-hidden="true"] ~ div',
          caseName: 'three events with no tone map',
        },
      ],
    },
    {
      component: 'ActivityTimelineDot',
      cases: [
        { name: 'the default tone', props: { tone: { icon: 'event' } } },
        {
          name: 'a consumer tone with both class overrides',
          props: { tone: { icon: 'call', dotClass: 'consumer-dot', iconClass: 'consumer-icon' } },
        },
        {
          name: 'empty class overrides emit no token',
          props: { tone: { icon: 'mail', dotClass: '', iconClass: '' } },
        },
        {
          name: 'className passthrough',
          props: { tone: { icon: 'event' }, className: 'parity-token' },
        },
        {
          name: 'the tone changes',
          props: { tone: { icon: 'event' } },
          interactions: [{ type: 'props', props: { tone: { icon: 'mail' } } }],
        },
        {
          name: 'the class overrides are removed',
          props: { tone: { icon: 'call', dotClass: 'consumer-dot', iconClass: 'consumer-icon' } },
          interactions: [{ type: 'props', props: { tone: { icon: 'event' } } }],
        },
      ],
    },
    {
      component: 'ActivityTimelineRow',
      cases: [
        {
          name: 'a title alone',
          props: { event: { id: '1', kind: 'call', title: 'Called Jane' }, tone },
        },
        {
          name: 'an absent tone falls back to the default icon',
          props: { event: { id: '1', kind: 'call', title: 'Called Jane' } },
        },
        {
          name: 'a meta label',
          props: { event: { id: '1', kind: 'call', title: 'Called Jane', meta: '2h ago' }, tone },
        },
        {
          name: 'a description',
          props: {
            event: { id: '1', kind: 'call', title: 'Called Jane', description: 'Left a voicemail' },
            tone,
          },
        },
        {
          name: 'a footer node',
          props: {
            event: {
              id: '1',
              kind: 'call',
              title: 'Called Jane',
              footer: { $nodes: [{ tag: 'span', attrs: { 'data-chip': '' }, children: ['vip'] }] },
            },
            tone,
          },
        },
        {
          name: 'meta, description and footer together',
          props: {
            event: {
              id: '1',
              kind: 'call',
              title: 'Called Jane',
              description: 'Left a voicemail',
              meta: '2h ago',
              footer: { $nodes: [{ tag: 'em', children: ['follow up'] }] },
            },
            tone,
          },
        },
        {
          name: 'node-valued title, meta and description',
          props: {
            event: {
              id: 'n1',
              kind: 'call',
              title: { $nodes: [{ tag: 'strong', children: ['Nia called'] }] },
              description: { $nodes: [{ tag: 'em', children: ['voicemail'] }] },
              meta: { $nodes: [{ tag: 'time', children: ['09:30'] }] },
            },
            tone,
          },
        },
        {
          name: 'a wrapper renders the row inside it',
          props: {
            event: { id: '1', kind: 'call', title: 'Called Jane' },
            tone,
            wrapper: {
              $fn: 'wrapper',
              nodes: [{ tag: 'a', attrs: { href: '/activities/1' }, children: ['wrapped row'] }],
            },
          },
        },
        {
          name: 'the title changes',
          props: { event: { id: '1', kind: 'call', title: 'Called Jane' }, tone },
          interactions: [
            { type: 'props', props: { event: { id: '1', kind: 'call', title: 'Called Bob' } } },
          ],
        },
        {
          name: 'the description, meta and footer are removed',
          props: {
            event: {
              id: '1',
              kind: 'call',
              title: 'Called Jane',
              description: 'Left a voicemail',
              meta: '2h ago',
              footer: { $nodes: [{ tag: 'em', children: ['follow up'] }] },
            },
            tone,
          },
          interactions: [
            {
              type: 'props',
              props: {
                event: {
                  id: '1',
                  kind: 'call',
                  title: 'Called Jane',
                  description: undefined,
                  meta: undefined,
                  footer: undefined,
                },
              },
            },
          ],
        },
      ],
    },
  ],
}
