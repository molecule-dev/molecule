<!--
  NotificationsPage: the drop-in `/notifications` page — header (title +
  mark-all-read), filter chips, paginated body, loading / empty / error states,
  and the pagination strip.

  Svelte counterpart of `@molecule/app-notifications-page-react`'s
  `NotificationsPage`: the same props (React names), the same DOM for the same
  input, and the same HTTP calls. Rows render through
  `@molecule/app-notification-feed-svelte`.
-->
<script lang="ts">
  import { NotificationFeed } from '@molecule/app-notification-feed-svelte'
  import { useHttpClient, useTranslation } from '@molecule/app-svelte'
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
   * Builds the query string for the list endpoint based on filter + page.
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

  let {
    pageSize,
    endpoint,
    markAllReadEndpoint,
    typeIcons,
    className,
    dataMolId,
  }: NotificationsPageProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const http = useHttpClient()

  let filter = $state<NotificationsPageFilter>('all')
  let offset = $state(0)
  let items = $state<NotificationsPageItem[]>([])
  let total = $state(0)
  let loading = $state(true)
  let error = $state<Error | null>(null)

  const limit = $derived(pageSize ?? DEFAULT_PAGE_SIZE)

  /**
   * The newest load's id. A response for an older query is dropped, so a
   * slow earlier page cannot replace the page now on screen (React's
   * effect cleanup `ignore` flag).
   */
  let loadId = 0

  /**
   * Loads one page, keeping the rows already shown while the request is in
   * flight (React's `setState((prev) => …)`).
   *
   * @param nextFilter - The filter chip to query with.
   * @param nextOffset - Items to skip.
   * @param listEndpoint - The list URL to query.
   * @param pageLimit - Page size.
   */
  const load = async (
    nextFilter: NotificationsPageFilter,
    nextOffset: number,
    listEndpoint: string,
    pageLimit: number,
  ): Promise<void> => {
    const id = ++loadId
    loading = true
    error = null
    try {
      const url = `${listEndpoint}${buildQuery(nextFilter, nextOffset, pageLimit)}`
      const response = await http.get<NotificationsPageResult>(url)
      if (id !== loadId) return
      items = response.data.items
      total = response.data.total
      loading = false
    } catch (caught) {
      if (id !== loadId) return
      error = caught instanceof Error ? caught : new Error(String(caught))
      items = []
      total = 0
      loading = false
    }
  }

  /**
   * The query the last load ran for. Spread props (`<Page {...props} />`, which
   * the composition root may use) invalidate every prop source at once, so the
   * effect compares the values it actually depends on instead of trusting the
   * re-run: a change of `typeIcons` alone must not refetch the list.
   */
  let loadedQuery: string | null = null

  $effect(() => {
    const listEndpoint = endpoint ?? DEFAULT_ENDPOINT
    const pageLimit = limit
    const query = `${listEndpoint}|${pageLimit}|${filter}|${offset}`
    if (query === loadedQuery) return
    loadedQuery = query
    void load(filter, offset, listEndpoint, pageLimit)
  })

  /**
   * Switches the active filter chip, returning to the first page.
   *
   * @param next - The filter to show.
   */
  const onChangeFilter = (next: NotificationsPageFilter): void => {
    filter = next
    offset = 0
  }

  /**
   * Marks every notification read (best effort) and reloads the list.
   */
  const onMarkAllRead = async (): Promise<void> => {
    try {
      await http.post(markAllReadEndpoint ?? DEFAULT_MARK_ALL_READ_ENDPOINT, undefined)
    } catch (_error) {
      // Swallow — mark-all-read is best-effort. The reload below
      // will surface any persistent error via the normal load() path.
    }
    await load(filter, offset, endpoint ?? DEFAULT_ENDPOINT, limit)
  }

  const feedItems = $derived(
    items.map((notification) => {
      const href =
        typeof notification.data?.href === 'string' && notification.data.href.length > 0
          ? notification.data.href
          : null
      return {
        id: notification.id,
        icon: resolveTypeIcon(notification.type, typeIcons),
        title: notification.title,
        body: notification.body,
        createdAt: notification.createdAt,
        href,
        unread: !notification.read,
      }
    }),
  )

  const unreadCount = $derived(items.filter((notification) => !notification.read).length)
  const totalPages = $derived(Math.max(1, Math.ceil(total / limit)))
  const currentPage = $derived(Math.floor(offset / limit) + 1)
  const hasPrev = $derived(offset > 0)
  const hasNext = $derived(offset + limit < total)

  const filterLabels = $derived<Record<NotificationsPageFilter, string>>({
    all: t('notificationsPage.filterAll', {}, { defaultValue: 'All' }),
    unread: t('notificationsPage.filterUnread', {}, { defaultValue: 'Unread' }),
    mentions: t('notificationsPage.filterMentions', {}, { defaultValue: 'Mentions' }),
  })
</script>

<section
  class={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, cm.stack(6), className)}
  data-mol-id={dataMolId ?? 'notifications-page'}
  aria-busy={loading ? 'true' : undefined}
>
  <header class={cm.stack(2)}>
    <div class={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}>
      <h1 class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
        {t('notificationsPage.title', {}, { defaultValue: 'Notifications' })}
      </h1>
      {#if unreadCount > 0}
        <button
          type="button"
          onclick={() => void onMarkAllRead()}
          data-mol-id="notifications-page-mark-all-read"
          class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.cursorPointer)}
        >
          {t(
            'notificationsPage.markAllRead',
            { count: unreadCount },
            { defaultValue: 'Mark {{count}} as read' },
          )}
        </button>
      {/if}
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
    {#each FILTERS as key (key)}
      <button
        type="button"
        role="tab"
        aria-selected={filter === key}
        onclick={() => onChangeFilter(key)}
        data-mol-id={`notifications-page-filter-${key}`}
        class={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 1),
          cm.textSize('sm'),
          cm.fontWeight(filter === key ? 'semibold' : 'medium'),
          cm.cursorPointer,
        )}
      >
        {filterLabels[key]}
      </button>
    {/each}
  </div>

  {#if error}
    <div
      role="alert"
      data-mol-id="notifications-page-error"
      class={cm.cn(cm.sp('p', 4), cm.textCenter, cm.textSize('sm'))}
    >
      {t(
        'notificationsPage.error',
        { message: error.message },
        { defaultValue: 'Could not load notifications.' },
      )}
    </div>
  {:else if loading && items.length === 0}
    <div
      role="status"
      aria-live="polite"
      data-mol-id="notifications-page-loading"
      class={cm.cn(cm.sp('p', 6), cm.textCenter, cm.textSize('sm'), cm.textMuted)}
    >
      {t('notificationsPage.loading', {}, { defaultValue: 'Loading notifications…' })}
    </div>
  {:else if feedItems.length === 0}
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
  {:else}
    <NotificationFeed
      items={feedItems}
      ariaLabel={t('notificationsPage.feedAriaLabel', {}, { defaultValue: 'Notifications' })}
      dataMolId="notifications-page-feed"
    />
  {/if}

  {#if total > limit}
    <nav
      aria-label={t('notificationsPage.paginationAriaLabel', {}, { defaultValue: 'Pagination' })}
      class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}
    >
      <button
        type="button"
        disabled={!hasPrev}
        onclick={() => (offset = Math.max(0, offset - limit))}
        data-mol-id="notifications-page-prev"
        class={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          hasPrev ? cm.cursorPointer : undefined,
        )}
      >
        {t('notificationsPage.prev', {}, { defaultValue: 'Previous' })}
      </button>
      <span class={cm.cn(cm.textSize('sm'), cm.textMuted)}>
        {t(
          'notificationsPage.pageOf',
          { current: currentPage, total: totalPages },
          { defaultValue: 'Page {{current}} of {{total}}' },
        )}
      </span>
      <button
        type="button"
        disabled={!hasNext}
        onclick={() => (offset = offset + limit)}
        data-mol-id="notifications-page-next"
        class={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          hasNext ? cm.cursorPointer : undefined,
        )}
      >
        {t('notificationsPage.next', {}, { defaultValue: 'Next' })}
      </button>
    </nav>
  {/if}
</section>
