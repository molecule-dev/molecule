/**
 * `@molecule/app-activity-feed-react` cases: the flat feed list, the
 * date-grouped section, and the single activity row.
 *
 * Every runtime export of the React package is covered: `ActivityFeed`,
 * `ActivityFeedGroup` and `ActivityFeedItem`. The package has no callback
 * props, so its branches are chosen by props alone — the interactions below
 * change props, walk the empty / non-empty branch switches, and let the row's
 * `<Avatar>` swap to its fallback on an image error. Every node-valued field
 * (`actor`, `verb`, `target`, `body`, `timestamp`, `icon`, `heading`,
 * `emptyState`, `footer`) is exercised as plain text and as a rendered node.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Rows with a plain-text target, as the React package's own README shows. */
const items = [
  { id: '1', actor: 'Alice', verb: 'commented on', target: 'PR #42', timestamp: '2m ago' },
  { id: '2', actor: 'Bob', verb: 'closed', target: 'Issue #7', timestamp: '1h ago' },
  { id: '3', actor: 'Carol', verb: 'deployed', target: 'api', timestamp: 'yesterday' },
]

/** The smallest row: actor, verb and timestamp only — no target, body or icon. */
const bareItem = { id: 'a', actor: 'actor-a', verb: 'verb-a', timestamp: 'ts-a' }

/** `@molecule/app-activity-feed-react`. */
export const activityFeedFeature: FeatureCases = {
  package: '@molecule/app-activity-feed-react',
  families: [
    {
      component: 'ActivityFeedItem',
      cases: [
        { name: 'actor, verb and timestamp', props: { item: bareItem } },
        {
          name: 'an explicit target',
          props: { item: { ...bareItem, target: 'tgt-a' } },
        },
        {
          name: 'an empty target renders nothing',
          props: { item: { ...bareItem, target: '' } },
        },
        {
          name: 'a body',
          props: { item: { ...bareItem, body: 'body-a' } },
        },
        {
          name: 'an empty body renders nothing',
          props: { item: { ...bareItem, body: '' } },
        },
        {
          name: 'target and body together',
          props: { item: { ...bareItem, target: 'tgt-a', body: 'body-a' } },
        },
        {
          name: 'an avatar source renders the Avatar',
          props: { item: { ...bareItem, avatarSrc: '/avatars/alice.jpg' } },
        },
        {
          name: 'an empty avatar source renders nothing',
          props: { item: { ...bareItem, avatarSrc: '' } },
        },
        {
          name: 'an icon alone replaces the empty avatar slot',
          props: {
            item: {
              ...bareItem,
              icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': '' } }] },
            },
          },
        },
        {
          name: 'an icon wins over an avatar source',
          props: {
            item: {
              ...bareItem,
              avatarSrc: '/avatars/alice.jpg',
              icon: { $nodes: [{ tag: 'strong', children: ['!'] }] },
            },
          },
        },
        {
          name: 'node values for actor, verb, target, body and timestamp',
          props: {
            item: {
              id: 'n',
              actor: { $nodes: [{ tag: 'strong', children: ['Node actor'] }] },
              verb: { $nodes: [{ tag: 'em', children: ['node verb'] }] },
              target: { $nodes: [{ tag: 'span', attrs: { 'data-target': '' }, children: ['T'] }] },
              body: { $nodes: [{ tag: 'blockquote', children: ['node body'] }] },
              timestamp: { $nodes: [{ tag: 'time', children: ['09:30'] }] },
            },
          },
        },
        {
          name: 'className passthrough',
          props: { item: bareItem, className: 'parity-token' },
        },
        {
          name: 'a new item replaces the row',
          props: { item: bareItem },
          interactions: [
            { type: 'props', props: { item: { ...bareItem, target: 'tgt-b', body: 'body-b' } } },
          ],
        },
        {
          name: 'the body and target are removed',
          props: { item: { ...bareItem, target: 'tgt-a', body: 'body-a' } },
          interactions: [
            { type: 'props', props: { item: { ...bareItem, target: undefined, body: undefined } } },
          ],
        },
        {
          name: 'an avatar source appears at runtime',
          props: { item: bareItem },
          interactions: [
            { type: 'props', props: { item: { ...bareItem, avatarSrc: '/avatars/bob.jpg' } } },
          ],
        },
        {
          name: 'an avatar image error falls back to initials',
          props: { item: { ...bareItem, avatarSrc: '/avatars/broken.jpg' } },
          interactions: [{ type: 'event', selector: 'img', event: 'error' }],
        },
        {
          name: 'the className is removed',
          props: { item: bareItem, className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: undefined } }],
        },
      ],
    },
    {
      component: 'ActivityFeed',
      cases: [
        { name: 'a single row', props: { items: [items[0]!] } },
        { name: 'three rows', props: { items } },
        { name: 'no items and no empty state', props: { items: [] } },
        {
          name: 'an empty state when the list is empty',
          props: { items: [] },
          slots: {
            emptyState: [{ tag: 'p', attrs: { 'data-empty': '' }, children: ['Nothing yet'] }],
          },
        },
        {
          name: 'a text empty state when the list is empty',
          props: { items: [] },
          slots: { emptyState: ['Nothing yet'] },
        },
        {
          name: 'the empty state wins over the footer',
          props: { items: [] },
          slots: {
            emptyState: [{ tag: 'p', attrs: { 'data-empty': '' }, children: ['Nothing yet'] }],
            footer: [{ tag: 'button', attrs: { type: 'button' }, children: ['Load more'] }],
          },
        },
        {
          name: 'the empty state is ignored when rows exist',
          props: { items: [items[0]!] },
          slots: { emptyState: [{ tag: 'p', attrs: { 'data-empty': '' }, children: ['Nothing'] }] },
        },
        {
          name: 'a footer after the rows',
          props: { items: [items[0]!] },
          slots: {
            footer: [{ tag: 'button', attrs: { type: 'button' }, children: ['Load more'] }],
          },
        },
        {
          name: 'a footer with no rows',
          props: { items: [] },
          slots: {
            footer: [{ tag: 'button', attrs: { type: 'button' }, children: ['Load more'] }],
          },
        },
        {
          name: 'an empty footer renders nothing',
          props: { items: [items[0]!] },
          slots: { footer: [] },
        },
        {
          name: 'rows with node fields',
          props: {
            items: [
              {
                id: 'n1',
                actor: { $nodes: [{ tag: 'strong', children: ['Nia'] }] },
                verb: 'edited',
                target: { $nodes: [{ tag: 'code', children: ['index.ts'] }] },
                body: { $nodes: [{ tag: 'em', children: ['whitespace'] }] },
                timestamp: { $nodes: [{ tag: 'time', children: ['10:00'] }] },
              },
              {
                id: 'n2',
                actor: 'Ola',
                verb: 'joined',
                timestamp: 'just now',
                icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': '' } }] },
              },
            ],
          },
        },
        {
          name: 'className passthrough',
          props: { items: [items[0]!], className: 'parity-token' },
        },
        {
          name: 'more rows arrive',
          props: { items: [items[0]!] },
          interactions: [{ type: 'props', props: { items } }],
        },
        {
          name: 'every row is emptied',
          props: { items },
          interactions: [{ type: 'props', props: { items: [] } }],
        },
        {
          name: 'the empty state appears once the rows are gone',
          props: { items: [items[0]!] },
          interactions: [{ type: 'props', props: { items: [] } }],
        },
        {
          name: 'the className is removed',
          props: { items: [items[0]!], className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: undefined } }],
        },
      ],
      keyedLists: [{ prop: 'items', selector: 'article', caseName: 'three rows' }],
    },
    {
      component: 'ActivityFeedGroup',
      cases: [
        { name: 'a heading and one row', props: { heading: 'Today', items: [items[0]!] } },
        { name: 'a heading and three rows', props: { heading: 'Today', items } },
        { name: 'a heading with no rows', props: { heading: 'Yesterday', items: [] } },
        {
          name: 'a node heading',
          props: { items: [items[0]!] },
          slots: { heading: [{ tag: 'strong', children: ['This week'] }] },
        },
        {
          name: 'rows with node fields',
          props: {
            heading: 'Earlier',
            items: [
              {
                id: 'n1',
                actor: { $nodes: [{ tag: 'b', children: ['Ada'] }] },
                verb: 'shipped',
                target: { $nodes: [{ tag: 'code', children: ['v2'] }] },
                timestamp: 'Mar 1',
              },
            ],
          },
        },
        {
          name: 'className passthrough',
          props: { heading: 'Today', items: [items[0]!], className: 'parity-token' },
        },
        {
          name: 'the rows change',
          props: { heading: 'Today', items: [items[0]!] },
          interactions: [{ type: 'props', props: { items: [items[1]!, items[2]!] } }],
        },
        {
          name: 'the heading changes',
          props: { heading: 'Today', items: [items[0]!] },
          interactions: [{ type: 'props', props: { heading: 'Tomorrow' } }],
        },
        {
          name: 'the rows are emptied',
          props: { heading: 'Today', items },
          interactions: [{ type: 'props', props: { items: [] } }],
        },
        {
          name: 'the className is removed',
          props: { heading: 'Today', items: [items[0]!], className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: undefined } }],
        },
      ],
      keyedLists: [{ prop: 'items', selector: 'article', caseName: 'a heading and three rows' }],
    },
  ],
}
