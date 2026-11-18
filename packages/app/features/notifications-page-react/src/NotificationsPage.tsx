import type React from 'react'
import { useEffect, useMemo, useState } from 'react'

import { type FeedItem, NotificationFeed } from '@molecule/app-notification-feed-react'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { useValueAtKeyChange } from '@molecule/app-react/render'
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

interface PageState {
  items: NotificationsPageItem[]
  total: number
  loading: boolean
  error: Error | null
}

const INITIAL_STATE: PageState = {
  items: [],
  total: 0,
  loading: true,
  error: null,
}

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
 * @param props - Configuration props.
 * @param props.pageSize - Items per page (default 20).
 * @param props.endpoint - Override the `GET /notifications` URL.
 * @param props.markAllReadEndpoint - Override the `POST /notifications/read-all` URL.
 * @param props.typeIcons - Optional `type → material-symbol` overrides.
 * @param props.className - Extra classes appended to the outer wrapper.
 * @param props.dataMolId - `data-mol-id` selector for AI-agent interaction.
 * @returns The rendered page element.
 */
export function NotificationsPage({
  pageSize = DEFAULT_PAGE_SIZE,
  endpoint = DEFAULT_ENDPOINT,
  markAllReadEndpoint = DEFAULT_MARK_ALL_READ_ENDPOINT,
  typeIcons,
  className,
  dataMolId,
}: NotificationsPageProps = {}): React.ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [filter, setFilter] = useState<NotificationsPageFilter>('all')
  const [offset, setOffset] = useState(0)
  const [reloadCount, setReloadCount] = useState(0)
  const [state, setState] = useState<PageState>(INITIAL_STATE)

  const limit = pageSize

  // The list request follows the filter, the page and a reload asked for after
  // mark-all-read. The effect writes no state of its own: the loading flag is
  // raised by the interaction that changed the query (see `beginLoad`), and the
  // response settles the page. A response for a superseded query is dropped, so
  // a slow earlier page cannot replace the page now on screen.
  useEffect(() => {
    let ignore = false
    void http.get<NotificationsPageResult>(`${endpoint}${buildQuery(filter, offset, limit)}`).then(
      (res) => {
        if (ignore) return
        setState({ items: res.data.items, total: res.data.total, loading: false, error: null })
      },
      (err: unknown) => {
        if (ignore) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ items: [], total: 0, loading: false, error })
      },
    )
    return () => {
      ignore = true
    }
  }, [endpoint, filter, http, limit, offset, reloadCount])

  /**
   * Marks the page as loading and clears the previous failure, for the
   * interactions that are about to change the query.
   */
  const beginLoad = (): void => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
  }

  const onChangeFilter = (next: NotificationsPageFilter): void => {
    // Re-selecting the active filter on its first page changes nothing; on a
    // later page it keeps its own contract of returning to page one.
    if (next === filter && offset === 0) return
    beginLoad()
    setFilter(next)
    setOffset(0)
  }

  const onMarkAllRead = async (): Promise<void> => {
    try {
      await http.post(markAllReadEndpoint, undefined)
    } catch (_error) {
      // Swallow — mark-all-read is best-effort. The reload below
      // will surface any persistent error via the normal request path.
    }
    beginLoad()
    setReloadCount((count) => count + 1)
  }

  // The mapped rows keep one identity until the items or the icon overrides
  // change, so the feed's own memo does not see a new array every render.
  const feedItems: FeedItem[] = useValueAtKeyChange<FeedItem[]>(
    state.items.map((n) => {
      const href = typeof n.data?.href === 'string' && n.data.href.length > 0 ? n.data.href : null
      return {
        id: n.id,
        icon: resolveTypeIcon(n.type, typeIcons),
        title: n.title,
        body: n.body,
        createdAt: n.createdAt,
        href,
        unread: !n.read,
      }
    }),
    [state.items, typeIcons],
  )

  const unreadCount = useMemo(() => state.items.filter((n) => !n.read).length, [state.items])

  const totalPages = Math.max(1, Math.ceil(state.total / limit))
  const currentPage = Math.floor(offset / limit) + 1
  const hasPrev = offset > 0
  const hasNext = offset + limit < state.total

  const filterLabels: Record<NotificationsPageFilter, string> = {
    all: t('notificationsPage.filterAll', {}, { defaultValue: 'All' }),
    unread: t('notificationsPage.filterUnread', {}, { defaultValue: 'Unread' }),
    mentions: t('notificationsPage.filterMentions', {}, { defaultValue: 'Mentions' }),
  }

  return (
    <section
      className={cm.cn(
        cm.sp('px', 6),
        cm.sp('py', 8),
        cm.maxW('4xl'),
        cm.mxAuto,
        cm.stack(6 as const),
        className,
      )}
      data-mol-id={dataMolId ?? 'notifications-page'}
      aria-busy={state.loading || undefined}
    >
      <header className={cm.stack(2 as const)}>
        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('notificationsPage.title', {}, { defaultValue: 'Notifications' })}
          </h1>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              data-mol-id="notifications-page-mark-all-read"
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.cursorPointer)}
            >
              {t(
                'notificationsPage.markAllRead',
                { count: unreadCount },
                { defaultValue: 'Mark {{count}} as read' },
              )}
            </button>
          )}
        </div>
      </header>

      <div
        role="tablist"
        aria-label={t(
          'notificationsPage.filterAriaLabel',
          {},
          { defaultValue: 'Filter notifications' },
        )}
        className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}
      >
        {FILTERS.map((key) => {
          const active = filter === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChangeFilter(key)}
              data-mol-id={`notifications-page-filter-${key}`}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('sm'),
                cm.fontWeight(active ? 'semibold' : 'medium'),
                cm.cursorPointer,
              )}
            >
              {filterLabels[key]}
            </button>
          )
        })}
      </div>

      {state.error ? (
        <div
          role="alert"
          data-mol-id="notifications-page-error"
          className={cm.cn(cm.sp('p', 4), cm.textCenter, cm.textSize('sm'))}
        >
          {t(
            'notificationsPage.error',
            { message: state.error.message },
            { defaultValue: 'Could not load notifications.' },
          )}
        </div>
      ) : state.loading && state.items.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          data-mol-id="notifications-page-loading"
          className={cm.cn(cm.sp('p', 6), cm.textCenter, cm.textSize('sm'), cm.textMuted)}
        >
          {t('notificationsPage.loading', {}, { defaultValue: 'Loading notifications…' })}
        </div>
      ) : feedItems.length === 0 ? (
        <div
          data-mol-id="notifications-page-empty"
          className={cm.cn(cm.sp('p', 8), cm.textCenter, cm.stack(2 as const))}
        >
          <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {t('notificationsPage.emptyTitle', {}, { defaultValue: 'You’re all caught up' })}
          </span>
          <span className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'notificationsPage.emptyBody',
              {},
              { defaultValue: 'New notifications will appear here.' },
            )}
          </span>
        </div>
      ) : (
        <NotificationFeed
          items={feedItems}
          ariaLabel={t('notificationsPage.feedAriaLabel', {}, { defaultValue: 'Notifications' })}
          dataMolId="notifications-page-feed"
        />
      )}

      {state.total > limit && (
        <nav
          aria-label={t(
            'notificationsPage.paginationAriaLabel',
            {},
            { defaultValue: 'Pagination' },
          )}
          className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}
        >
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => {
              beginLoad()
              setOffset(Math.max(0, offset - limit))
            }}
            data-mol-id="notifications-page-prev"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              hasPrev ? cm.cursorPointer : undefined,
            )}
          >
            {t('notificationsPage.prev', {}, { defaultValue: 'Previous' })}
          </button>
          <span className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'notificationsPage.pageOf',
              { current: currentPage, total: totalPages },
              { defaultValue: 'Page {{current}} of {{total}}' },
            )}
          </span>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => {
              beginLoad()
              setOffset(offset + limit)
            }}
            data-mol-id="notifications-page-next"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              hasNext ? cm.cursorPointer : undefined,
            )}
          >
            {t('notificationsPage.next', {}, { defaultValue: 'Next' })}
          </button>
        </nav>
      )}
    </section>
  )
}
