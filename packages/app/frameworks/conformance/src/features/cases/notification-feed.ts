/**
 * `@molecule/app-notification-feed-react` cases: the feed list, its rows, the
 * unread accent, the per-row link and the relative timestamp.
 *
 * Every runtime export of the React package is covered: `NotificationFeed` is
 * rendered by every family case, and `fmtRelativeShort` is compared by value.
 * The package has no callback props, so its branches are chosen by props
 * alone — the interactions below switch the empty / non-empty list, add and
 * remove a row's link, flip the unread accent, change and drop the wrapper's
 * attributes, and click a linked row (plain and modified).
 *
 * `fmtRelativeShort` reads the clock, so every case pins `now` and derives its
 * `createdAt` timestamps from that instant: the rendered text is the same on
 * every day the case runs.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The instant every case's clock is pinned to (`Date.now()`). */
const NOW = Date.UTC(2024, 5, 1, 12, 0, 0)

/** An ISO timestamp `minutes` before {@link NOW}. */
const minutesAgo = (minutes: number): string => new Date(NOW - minutes * 60_000).toISOString()

/** An ISO timestamp `hours` before {@link NOW}. */
const hoursAgo = (hours: number): string => new Date(NOW - hours * 3_600_000).toISOString()

/** An ISO timestamp `days` before {@link NOW}. */
const daysAgo = (days: number): string => new Date(NOW - days * 86_400_000).toISOString()

/** A feed row: typed icon, headline, body and a relative timestamp. */
interface Row {
  id: string
  icon: string
  title: string
  body: string
  createdAt: string
  href?: string | null
  unread?: boolean
}

/**
 * One feed row, with optional field overrides.
 *
 * @param id - The row's stable id.
 * @param over - Fields to override.
 * @returns The row data.
 */
const row = (id: string, over: Partial<Row> = {}): Row => ({
  id,
  icon: 'check_circle',
  title: `title-${id}`,
  body: `body-${id}`,
  createdAt: hoursAgo(3),
  ...over,
})

/** `@molecule/app-notification-feed-react`. */
export const notificationFeedFeature: FeatureCases = {
  package: '@molecule/app-notification-feed-react',
  families: [
    {
      component: 'NotificationFeed',
      cases: [
        {
          name: 'two notifications',
          props: { items: [row('a'), row('b')] },
          now: NOW,
        },
        {
          name: 'an unread notification with a link',
          props: {
            items: [row('a', { unread: true, href: '/notifications/a' })],
          },
          now: NOW,
        },
        {
          name: 'a read notification without a link',
          props: { items: [row('a')] },
          now: NOW,
        },
        {
          name: 'an explicitly read row with a null href',
          props: { items: [row('a', { unread: false, href: null })] },
          now: NOW,
        },
        {
          name: 'an empty href renders no link',
          props: { items: [row('a', { href: '' })] },
          now: NOW,
        },
        {
          name: 'an empty feed',
          props: { items: [] },
          now: NOW,
        },
        {
          name: 'aria-label, className and data-mol-id',
          props: {
            items: [row('a')],
            ariaLabel: 'Notifications',
            className: 'parity-token',
            dataMolId: 'feed-x',
          },
          now: NOW,
        },
        {
          name: 'every relative-time shape',
          props: {
            items: [
              row('future', { createdAt: new Date(NOW + 60_000).toISOString() }),
              row('minutes', { createdAt: minutesAgo(12) }),
              row('hours', { createdAt: hoursAgo(3) }),
              row('days', { createdAt: daysAgo(5) }),
            ],
          },
          now: NOW,
        },
        {
          name: 'mixed linked, unread and plain rows',
          props: {
            items: [
              row('a', { icon: 'chat', unread: true, href: '/notifications/a' }),
              row('b', { icon: 'warning', createdAt: minutesAgo(12) }),
              row('c', { href: '/notifications/c', createdAt: daysAgo(1) }),
            ],
          },
          now: NOW,
        },
        {
          name: 'clicking a linked row navigates',
          props: { items: [row('a', { href: '/notifications/a' })] },
          now: NOW,
          context: { route: '/inbox' },
          interactions: [{ type: 'click', selector: 'a' }],
        },
        {
          name: 'modified clicks on a linked row are left to the browser',
          props: { items: [row('a', { href: '/notifications/a' })] },
          now: NOW,
          context: { route: '/inbox' },
          interactions: [
            { type: 'click', selector: 'a', modifiers: { ctrlKey: true } },
            { type: 'click', selector: 'a', modifiers: { metaKey: true } },
            { type: 'click', selector: 'a', modifiers: { shiftKey: true } },
            { type: 'click', selector: 'a', modifiers: { altKey: true } },
          ],
        },
        {
          name: 'the aria-label changes',
          props: { items: [row('a')], ariaLabel: 'Notifications' },
          now: NOW,
          interactions: [{ type: 'props', props: { ariaLabel: 'Alerts' } }],
        },
        {
          name: 'rows arrive in an empty feed',
          props: { items: [] },
          now: NOW,
          interactions: [{ type: 'props', props: { items: [row('a'), row('b')] } }],
        },
        {
          name: 'the feed is emptied',
          props: { items: [row('a'), row('b')] },
          now: NOW,
          interactions: [{ type: 'props', props: { items: [] } }],
        },
        {
          name: 'a row gains a link',
          props: { items: [row('a')] },
          now: NOW,
          interactions: [
            { type: 'props', props: { items: [row('a', { href: '/notifications/a' })] } },
          ],
        },
        {
          name: 'a row loses its link',
          props: { items: [row('a', { href: '/notifications/a' })] },
          now: NOW,
          interactions: [{ type: 'props', props: { items: [row('a', { href: undefined })] } }],
        },
        {
          name: 'a row becomes unread',
          props: { items: [row('a', { unread: false })] },
          now: NOW,
          interactions: [{ type: 'props', props: { items: [row('a', { unread: true })] } }],
        },
        {
          name: 'a row is marked read again',
          props: { items: [row('a', { unread: true })] },
          now: NOW,
          interactions: [{ type: 'props', props: { items: [row('a', { unread: false })] } }],
        },
        {
          name: 'className and data-mol-id are removed',
          props: { items: [row('a')], className: 'parity-token', dataMolId: 'feed-x' },
          now: NOW,
          interactions: [{ type: 'props', props: { className: undefined, dataMolId: undefined } }],
        },
        {
          name: 'a row keeps its id with new text',
          props: { items: [row('a')] },
          now: NOW,
          interactions: [
            {
              type: 'props',
              props: { items: [row('a', { title: 'title-a2', body: 'body-a2' }), row('b')] },
            },
          ],
        },
      ],
      keyedLists: [{ prop: 'items', selector: 'li', caseName: 'two notifications' }],
    },
  ],
  values: [
    {
      export: 'fmtRelativeShort',
      calls: [
        // A timestamp still in the future renders React's zero-minute string.
        ['9999-12-31T23:59:59Z'],
        // An unparsable timestamp renders its NaN day count, as React's does.
        ['not-a-date'],
      ],
    },
  ],
}
