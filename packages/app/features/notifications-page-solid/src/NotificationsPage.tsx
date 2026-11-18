/**
 * Solid notifications page: header, filter chips, mark-all-read action,
 * paginated list, empty state.
 *
 * Solid counterpart of `@molecule/app-notifications-page-react`'s
 * `NotificationsPage` — the same props (React names), the same DOM for the
 * same input, and the same HTTP calls.
 *
 * @module
 */

import { batch, createEffect, createMemo, createSignal, type JSX } from 'solid-js'

import { NotificationFeed } from '@molecule/app-notification-feed-solid'
import { useHttpClient, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { resolveTypeIcon } from './typeIcons.js'
import type {
  NotificationsPageFilter,
  NotificationsPageItem,
  NotificationsPageProps,
  NotificationsPageResult,
} from './types.js'

const DEFAULT_PAGE_SIZE = 20
const DEFAULT_ENDPOINT = '/api/notifications'
const DEFAULT_MARK_ALL_READ_ENDPOINT = '/api/notifications/read-all'

const FILTERS: ReadonlyArray<NotificationsPageFilter> = ['all', 'unread', 'mentions']

/**
 * Build the query string for the list endpoint based on filter + page.
 *
 * - `all` → no extra params.
 * - `unread` → `read=false`.
 * - `mentions` → `type=mention`.
 *
 * @param filter - Active filter chip.
 * @param offset - Items to skip.
 * @param limit - Page size.
 * @returns A leading-`?` query string suitable to append to the endpoint URL.
 */
function buildQuery(filter: NotificationsPageFilter, offset: number, limit: number): string {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  if (filter === 'unread') params.set('read', 'false')
  if (filter === 'mentions') params.set('type', 'mention')
  return `?${params.toString()}`
}

/**
 * Drop-in `/notifications` page used by every flagship app.
 *
 * Composes `<NotificationFeed>` with a header (eyebrow + title +
 * mark-all-read action), a row of filter chips (all / unread / mentions),
 * a paginated body, and an empty state. All data is loaded over the HTTP
 * bond by hitting the routes exposed by `@molecule/api-resource-notification`.
 *
 * All UI text flows through `t()` so apps can localise via the companion
 * locale bond `@molecule/app-locales-notifications-page`. All
 * styling flows through `getClassMap()` — no Tailwind class strings live
 * here.
 *
 * @param props - Configuration props (see {@link NotificationsPageProps}).
 * @returns The notifications page.
 */
export function NotificationsPage(props: NotificationsPageProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [filter, setFilter] = createSignal<NotificationsPageFilter>('all')
  const [offset, setOffset] = createSignal(0)
  const [items, setItems] = createSignal<NotificationsPageItem[]>([])
  const [total, setTotal] = createSignal(0)
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal<Error | null>(null)

  /**
   * The newest load's id. A response for an older query is dropped, so a
   * slow earlier page cannot replace the page now on screen (React's
   * effect cleanup `ignore` flag).
   */
  let loadId = 0

  /**
   * Loads one page, keeping the rows already shown while the request is
   * in flight (React's `setState((prev) => …)`).
   *
   * @param nextFilter - The filter chip to query with.
   * @param nextOffset - Items to skip.
   * @param listEndpoint - The list URL to query.
   * @param limit - Page size.
   */
  const load = async (
    nextFilter: NotificationsPageFilter,
    nextOffset: number,
    listEndpoint: string,
    limit: number,
  ): Promise<void> => {
    const id = ++loadId
    setLoading(true)
    setError(null)
    try {
      const url = `${listEndpoint}${buildQuery(nextFilter, nextOffset, limit)}`
      const response = await http.get<NotificationsPageResult>(url)
      if (id !== loadId) return
      setItems(response.data.items)
      setTotal(response.data.total)
      setLoading(false)
    } catch (caught) {
      if (id !== loadId) return
      setError(caught instanceof Error ? caught : new Error(String(caught)))
      setItems([])
      setTotal(0)
      setLoading(false)
    }
  }

  createEffect(() => {
    const listEndpoint = props.endpoint ?? DEFAULT_ENDPOINT
    const limit = props.pageSize ?? DEFAULT_PAGE_SIZE
    void load(filter(), offset(), listEndpoint, limit)
  })

  /**
   * Switches the active filter chip, returning to the first page.
   *
   * @param next - The filter to show.
   */
  const onChangeFilter = (next: NotificationsPageFilter): void => {
    // One reload, as React's batched `setFilter` + `setOffset` in one event
    // produce: both signals change before the effect re-runs.
    batch(() => {
      setFilter(next)
      setOffset(0)
    })
  }

  /**
   * Marks every notification read (best effort) and reloads the list.
   */
  const onMarkAllRead = async (): Promise<void> => {
    try {
      await http.post(props.markAllReadEndpoint ?? DEFAULT_MARK_ALL_READ_ENDPOINT, undefined)
    } catch (_error) {
      // Swallow — mark-all-read is best-effort. The reload below
      // will surface any persistent error via the normal load() path.
    }
    await load(
      filter(),
      offset(),
      props.endpoint ?? DEFAULT_ENDPOINT,
      props.pageSize ?? DEFAULT_PAGE_SIZE,
    )
  }

  const feedItems = createMemo(() =>
    items().map((notification) => {
      const href =
        typeof notification.data?.href === 'string' && notification.data.href.length > 0
          ? notification.data.href
          : null
      return {
        id: notification.id,
        icon: resolveTypeIcon(notification.type, props.typeIcons),
        title: notification.title,
        body: notification.body,
        createdAt: notification.createdAt,
        href,
        unread: !notification.read,
      }
    }),
  )

  const unreadCount = createMemo(() => items().filter((notification) => !notification.read).length)

  const limit = createMemo(() => props.pageSize ?? DEFAULT_PAGE_SIZE)
  const totalPages = createMemo(() => Math.max(1, Math.ceil(total() / limit())))
  const currentPage = createMemo(() => Math.floor(offset() / limit()) + 1)
  const hasPrev = createMemo(() => offset() > 0)
  const hasNext = createMemo(() => offset() + limit() < total())

  const filterLabels = createMemo<Record<NotificationsPageFilter, string>>(() => ({
    all: t('notificationsPage.filterAll', {}, { defaultValue: 'All' }),
    unread: t('notificationsPage.filterUnread', {}, { defaultValue: 'Unread' }),
    mentions: t('notificationsPage.filterMentions', {}, { defaultValue: 'Mentions' }),
  }))

  return (
    <section
      class={cm.cn(
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.maxW('4xl'),
        cm.mxAuto,
        cm.stack(6),
        props.className,
      )}
      data-mol-id={props.dataMolId ?? 'notifications-page'}
      aria-busy={loading() ? 'true' : undefined}
    >
      <header class={cm.stack(2)}>
        <div class={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}>
          <h1 class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('notificationsPage.title', {}, { defaultValue: 'Notifications' })}
          </h1>
          {unreadCount() > 0 ? (
            <button
              type="button"
              onClick={() => void onMarkAllRead()}
              data-mol-id="notifications-page-mark-all-read"
              class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.cursorPointer)}
            >
              {t(
                'notificationsPage.markAllRead',
                { count: unreadCount() },
                { defaultValue: 'Mark {{count}} as read' },
              )}
            </button>
          ) : null}
        </div>
      </header>

      <div
        role="tablist"
        aria-label={t(
          'notificationsPage.filterAriaLabel',
          {},
          { defaultValue: 'Filter notifications' },
        )}
        class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}
      >
        {FILTERS.map((key) => (
          <button
            type="button"
            role="tab"
            aria-selected={filter() === key}
            onClick={() => onChangeFilter(key)}
            data-mol-id={`notifications-page-filter-${key}`}
            class={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('sm'),
              cm.fontWeight(filter() === key ? 'semibold' : 'medium'),
              cm.cursorPointer,
            )}
          >
            {filterLabels()[key]}
          </button>
        ))}
      </div>

      {error() ? (
        <div
          role="alert"
          data-mol-id="notifications-page-error"
          class={cm.cn(cm.sp('p', 4), cm.textCenter, cm.textSize('sm'))}
        >
          {t(
            'notificationsPage.error',
            { message: error()!.message },
            { defaultValue: 'Could not load notifications.' },
          )}
        </div>
      ) : loading() && items().length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          data-mol-id="notifications-page-loading"
          class={cm.cn(cm.sp('p', 6), cm.textCenter, cm.textSize('sm'), cm.textMuted)}
        >
          {t('notificationsPage.loading', {}, { defaultValue: 'Loading notifications…' })}
        </div>
      ) : feedItems().length === 0 ? (
        <div
          data-mol-id="notifications-page-empty"
          class={cm.cn(cm.sp('p', 8), cm.textCenter, cm.stack(2))}
        >
          <span class={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('notificationsPage.emptyTitle', {}, { defaultValue: 'You’re all caught up' })}
          </span>
          <span class={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'notificationsPage.emptyBody',
              {},
              { defaultValue: 'New notifications will appear here.' },
            )}
          </span>
        </div>
      ) : (
        <NotificationFeed
          items={feedItems()}
          ariaLabel={t('notificationsPage.feedAriaLabel', {}, { defaultValue: 'Notifications' })}
          dataMolId="notifications-page-feed"
        />
      )}

      {total() > limit() ? (
        <nav
          aria-label={t(
            'notificationsPage.paginationAriaLabel',
            {},
            { defaultValue: 'Pagination' },
          )}
          class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}
        >
          <button
            type="button"
            disabled={!hasPrev()}
            onClick={() => setOffset(Math.max(0, offset() - limit()))}
            data-mol-id="notifications-page-prev"
            class={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              hasPrev() ? cm.cursorPointer : undefined,
            )}
          >
            {t('notificationsPage.prev', {}, { defaultValue: 'Previous' })}
          </button>
          <span class={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'notificationsPage.pageOf',
              { current: currentPage(), total: totalPages() },
              { defaultValue: 'Page {{current}} of {{total}}' },
            )}
          </span>
          <button
            type="button"
            disabled={!hasNext()}
            onClick={() => setOffset(offset() + limit())}
            data-mol-id="notifications-page-next"
            class={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              hasNext() ? cm.cursorPointer : undefined,
            )}
          >
            {t('notificationsPage.next', {}, { defaultValue: 'Next' })}
          </button>
        </nav>
      ) : null}
    </section>
  )
}
