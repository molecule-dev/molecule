/**
 * `@molecule/app-notifications-page-react` cases: the notifications page —
 * header (title + mark-all-read), filter chips, paginated body, loading,
 * empty and error states, and the pagination strip.
 *
 * Every case mounts through the binding kit's full composition
 * (`composition: 'app'`): the page reads the HTTP bond for the list and the
 * mark-all-read action, so each case's context scripts those requests and
 * every one the page makes is recorded as a service call.
 *
 * Its rows are rendered by `@molecule/app-notification-feed-react`, which
 * prints each row's timestamp relative to the clock, so every case pins `now`
 * and derives its `createdAt` values from that instant: the rendered text is
 * the same on every day the case runs.
 *
 * @module
 */

import type { BindingContext, HttpScript } from '../../bindings/spec.js'
import type { FeatureCases } from '../spec.js'

/** The instant every case's clock is pinned to (`Date.now()`). */
const NOW = Date.UTC(2024, 5, 1, 12, 0, 0)

/** An ISO timestamp `minutes` before {@link NOW}. */
const minutesAgo = (minutes: number): string => new Date(NOW - minutes * 60_000).toISOString()

/** An ISO timestamp `hours` before {@link NOW}. */
const hoursAgo = (hours: number): string => new Date(NOW - hours * 3_600_000).toISOString()

/** The list endpoint and the query strings the page builds for it. */
const LIST = '/api/notifications'
const FIRST_PAGE = `${LIST}?limit=20&offset=0`
const UNREAD_PAGE = `${FIRST_PAGE}&read=false`
const MENTIONS_PAGE = `${FIRST_PAGE}&type=mention`
const SECOND_PAGE = `${LIST}?limit=20&offset=20`
const MARK_ALL_READ = '/api/notifications/read-all'

/** One notification row, as `GET /notifications` answers it. */
interface Row {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: string
  data?: Record<string, unknown>
}

/**
 * One notification row, with optional field overrides.
 *
 * @param id - The row's stable id.
 * @param over - Fields to override.
 * @returns The row data.
 */
const row = (id: string, over: Partial<Row> = {}): Row => ({
  id,
  type: 'system',
  title: `title-${id}`,
  body: `body-${id}`,
  read: false,
  createdAt: minutesAgo(5),
  ...over,
})

/** Three mixed rows: an unread message, a linked unread mention and a read system notice. */
const sampleRows: Row[] = [
  row('n1', { type: 'message', title: 'New DM', body: 'Hello there.', createdAt: minutesAgo(1) }),
  row('n2', {
    type: 'mention',
    title: 'You were mentioned',
    body: '@you check this out',
    createdAt: minutesAgo(5),
    data: { href: '/threads/42' },
  }),
  row('n3', {
    type: 'system',
    title: 'Welcome',
    body: 'Thanks for joining',
    read: true,
    createdAt: hoursAgo(1),
  }),
]

/**
 * A paginated list answer.
 *
 * @param items - The page's rows.
 * @param total - Total matching rows (defaults to the page's own count).
 * @returns The response body.
 */
const list = (items: Row[], total: number = items.length): Record<string, unknown> => ({
  items,
  total,
  offset: 0,
  limit: 20,
})

/**
 * A scripted `GET` of the notifications list.
 *
 * @param url - The exact URL the page requests.
 * @param items - The page's rows.
 * @param total - Total matching rows (defaults to the page's own count).
 * @param over - Extra script fields (a status, a network error, `defer`).
 * @returns The HTTP script.
 */
const get = (
  url: string,
  items: Row[],
  total: number = items.length,
  over: Partial<HttpScript> = {},
): HttpScript => ({ method: 'GET', url, data: list(items, total), ...over })

/** The signed-in context the page runs with (it reads no auth, so it stays empty). */
const app: BindingContext = {}

/** `@molecule/app-notifications-page-react`. */
export const notificationsPageFeature: FeatureCases = {
  package: '@molecule/app-notifications-page-react',
  composition: 'app',
  families: [
    {
      component: 'NotificationsPage',
      cases: [
        {
          name: 'defaults load the first page and render its rows',
          context: { ...app, http: [get(FIRST_PAGE, sampleRows)] },
          now: NOW,
        },
        {
          name: 'an empty page shows the caught-up state',
          context: { ...app, http: [get(FIRST_PAGE, [])] },
          now: NOW,
        },
        {
          name: 'an all-read page hides the mark-all-read action',
          context: {
            ...app,
            http: [get(FIRST_PAGE, [row('n1', { read: true }), row('n2', { read: true })])],
          },
          now: NOW,
        },
        {
          name: 'loading shows before the first page answers',
          context: { ...app, http: [get(FIRST_PAGE, sampleRows, undefined, { defer: true })] },
          now: NOW,
          interactions: [{ type: 'http', method: 'GET', url: FIRST_PAGE, data: list(sampleRows) }],
        },
        {
          name: 'a failed first load shows the alert',
          context: { ...app, http: [get(FIRST_PAGE, [], 0, { status: 500, data: {} })] },
          now: NOW,
        },
        {
          name: 'a failed filter change replaces the rows with the alert',
          context: {
            ...app,
            http: [
              get(FIRST_PAGE, sampleRows),
              { method: 'GET', url: UNREAD_PAGE, status: 500, data: {} },
            ],
          },
          now: NOW,
          interactions: [
            { type: 'click', selector: '[data-mol-id="notifications-page-filter-unread"]' },
          ],
        },
        {
          name: 'the unread filter queries read=false',
          context: {
            ...app,
            http: [get(FIRST_PAGE, sampleRows), get(UNREAD_PAGE, sampleRows.slice(0, 2))],
          },
          now: NOW,
          interactions: [
            { type: 'click', selector: '[data-mol-id="notifications-page-filter-unread"]' },
          ],
        },
        {
          name: 'the mentions filter queries type=mention',
          context: {
            ...app,
            http: [get(FIRST_PAGE, sampleRows), get(MENTIONS_PAGE, [sampleRows[1]!])],
          },
          now: NOW,
          interactions: [
            { type: 'click', selector: '[data-mol-id="notifications-page-filter-mentions"]' },
          ],
        },
        {
          name: 'clicking the active filter reloads nothing',
          context: { ...app, http: [get(FIRST_PAGE, sampleRows)] },
          now: NOW,
          interactions: [
            { type: 'click', selector: '[data-mol-id="notifications-page-filter-all"]' },
          ],
        },
        {
          name: 'a full single page hides the pagination strip',
          context: { ...app, http: [get(FIRST_PAGE, sampleRows, 20)] },
          now: NOW,
        },
        {
          name: 'pagination pages forward and back',
          context: {
            ...app,
            http: [
              get(FIRST_PAGE, sampleRows, 25),
              get(SECOND_PAGE, [row('n4', { createdAt: hoursAgo(2) })], 25),
              get(FIRST_PAGE, sampleRows, 25),
            ],
          },
          now: NOW,
          interactions: [
            { type: 'click', selector: '[data-mol-id="notifications-page-next"]' },
            { type: 'click', selector: '[data-mol-id="notifications-page-prev"]' },
          ],
        },
        {
          name: 'changing the filter from the second page resets the offset',
          context: {
            ...app,
            http: [
              get(FIRST_PAGE, sampleRows, 45),
              get(SECOND_PAGE, sampleRows, 45),
              get(UNREAD_PAGE, sampleRows.slice(0, 2)),
            ],
          },
          now: NOW,
          interactions: [
            { type: 'click', selector: '[data-mol-id="notifications-page-next"]' },
            { type: 'click', selector: '[data-mol-id="notifications-page-filter-unread"]' },
          ],
        },
        {
          name: 'mark all read posts then reloads the list',
          context: {
            ...app,
            http: [
              get(FIRST_PAGE, sampleRows),
              { method: 'POST', url: MARK_ALL_READ, data: { ok: true } },
              get(
                FIRST_PAGE,
                sampleRows.map((n) => ({ ...n, read: true })),
              ),
            ],
          },
          now: NOW,
          interactions: [
            { type: 'click', selector: '[data-mol-id="notifications-page-mark-all-read"]' },
          ],
        },
        {
          name: 'a failed mark all read still reloads the list',
          context: {
            ...app,
            http: [
              get(FIRST_PAGE, sampleRows),
              { method: 'POST', url: MARK_ALL_READ, status: 500, data: {} },
              get(FIRST_PAGE, sampleRows),
            ],
          },
          now: NOW,
          interactions: [
            { type: 'click', selector: '[data-mol-id="notifications-page-mark-all-read"]' },
          ],
        },
        {
          name: 'custom page size, endpoints, classes and id',
          props: {
            pageSize: 5,
            endpoint: '/v2/notifs',
            markAllReadEndpoint: '/v2/notifs/read-all',
            className: 'parity-page',
            dataMolId: 'notifs-page',
          },
          context: {
            ...app,
            http: [
              get('/v2/notifs?limit=5&offset=0', sampleRows, 12),
              { method: 'POST', url: '/v2/notifs/read-all', data: {} },
              get(
                '/v2/notifs?limit=5&offset=0',
                sampleRows.map((n) => ({ ...n, read: true })),
                12,
              ),
            ],
          },
          now: NOW,
          interactions: [
            { type: 'click', selector: '[data-mol-id="notifications-page-mark-all-read"]' },
          ],
        },
        {
          name: 'type icon overrides and the unknown fallback',
          props: { typeIcons: { message: 'star', custom: 'bolt' } },
          context: {
            ...app,
            http: [
              get(FIRST_PAGE, [
                row('n1', { type: 'message', createdAt: minutesAgo(2) }),
                row('n2', { type: 'custom', createdAt: minutesAgo(3) }),
                row('n3', { type: 'unmapped', createdAt: minutesAgo(4) }),
              ]),
            ],
          },
          now: NOW,
        },
        {
          name: 'type icon overrides change the glyphs',
          props: { typeIcons: { message: 'star' } },
          context: { ...app, http: [get(FIRST_PAGE, [row('n1', { type: 'message' })])] },
          now: NOW,
          interactions: [{ type: 'props', props: { typeIcons: { message: 'bolt' } } }],
        },
        {
          name: 'page size and endpoint changes reload the list',
          context: {
            ...app,
            http: [
              get(FIRST_PAGE, sampleRows),
              get(`${LIST}?limit=5&offset=0`, sampleRows),
              get('/v3/notifs?limit=5&offset=0', sampleRows),
            ],
          },
          now: NOW,
          interactions: [
            { type: 'props', props: { pageSize: 5 } },
            { type: 'props', props: { endpoint: '/v3/notifs' } },
          ],
        },
        {
          name: 'a pending filter change keeps the old rows busy',
          context: {
            ...app,
            http: [
              get(FIRST_PAGE, sampleRows),
              get(UNREAD_PAGE, sampleRows.slice(0, 2), undefined, { defer: true }),
            ],
          },
          now: NOW,
          interactions: [
            { type: 'click', selector: '[data-mol-id="notifications-page-filter-unread"]' },
            {
              type: 'http',
              method: 'GET',
              url: UNREAD_PAGE,
              data: list(sampleRows.slice(0, 2)),
            },
          ],
        },
        {
          name: 'a linked row navigates',
          context: { ...app, route: '/inbox', http: [get(FIRST_PAGE, sampleRows)] },
          now: NOW,
          interactions: [{ type: 'click', selector: 'ul li a' }],
        },
        {
          name: 'an empty or non-string href renders a plain row',
          context: {
            ...app,
            http: [
              get(FIRST_PAGE, [
                row('n1', { title: 'Empty href', data: { href: '' } }),
                row('n2', { title: 'Number href', data: { href: 42 } }),
                row('n3', { title: 'Linked', data: { href: '/threads/7' } }),
              ]),
            ],
          },
          now: NOW,
        },
      ],
    },
  ],
  values: [
    { export: 'DEFAULT_TYPE_ICONS' },
    {
      export: 'resolveTypeIcon',
      calls: [
        ['message'],
        ['unknown'],
        ['message', { message: 'star' }],
        ['alert', {}],
        ['unmapped', { message: 'star' }],
      ],
    },
  ],
}
