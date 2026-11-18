/**
 * Vue notifications page: header, filter chips, mark-all-read action,
 * paginated list, empty state.
 *
 * Vue counterpart of `@molecule/app-notifications-page-react`'s
 * `NotificationsPage` — the same props (React names), the same DOM for the
 * same input, and the same HTTP calls.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType, type Ref, ref, type VNode, watch } from 'vue'

import { NotificationFeed } from '@molecule/app-notification-feed-vue'
import { getClassMap } from '@molecule/app-ui'
import { useHttpClient, useTranslation } from '@molecule/app-vue'

import { resolveTypeIcon } from './typeIcons.js'
import type {
  NotificationsPageFilter,
  NotificationsPageItem,
  NotificationsPageResult,
  NotificationsPageTypeIconMap,
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
 * @param props - Configuration props.
 * @returns The notifications page component.
 */
export const NotificationsPage = defineComponent({
  name: 'NotificationsPage',
  props: {
    /** Items per page (default 20). */
    pageSize: { type: Number, required: false, default: undefined },
    /** Override the `GET /notifications` URL. */
    endpoint: { type: String, required: false, default: undefined },
    /** Override the `POST /notifications/read-all` URL. */
    markAllReadEndpoint: { type: String, required: false, default: undefined },
    /** Optional `type → material-symbol` overrides. */
    typeIcons: {
      type: Object as PropType<NotificationsPageTypeIconMap>,
      required: false,
      default: undefined,
    },
    /** Extra classes appended to the outer wrapper. */
    className: { type: String, required: false, default: undefined },
    /** `data-mol-id` selector for AI-agent interaction. */
    dataMolId: { type: String, required: false, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const http = useHttpClient()

    const filter: Ref<NotificationsPageFilter> = ref<NotificationsPageFilter>('all')
    const offset: Ref<number> = ref(0)
    const items: Ref<NotificationsPageItem[]> = ref([])
    const total: Ref<number> = ref(0)
    const loading: Ref<boolean> = ref(true)
    const error: Ref<Error | null> = ref(null)

    const limit = computed<number>(() => props.pageSize ?? DEFAULT_PAGE_SIZE)
    const endpoint = computed<string>(() => props.endpoint ?? DEFAULT_ENDPOINT)
    const markAllReadEndpoint = computed<string>(
      () => props.markAllReadEndpoint ?? DEFAULT_MARK_ALL_READ_ENDPOINT,
    )

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
     */
    const load = async (nextFilter: NotificationsPageFilter, nextOffset: number): Promise<void> => {
      const id = ++loadId
      loading.value = true
      error.value = null
      try {
        const url = `${endpoint.value}${buildQuery(nextFilter, nextOffset, limit.value)}`
        const response = await http.get<NotificationsPageResult>(url)
        if (id !== loadId) return
        items.value = response.data.items
        total.value = response.data.total
        loading.value = false
      } catch (caught) {
        if (id !== loadId) return
        error.value = caught instanceof Error ? caught : new Error(String(caught))
        items.value = []
        total.value = 0
        loading.value = false
      }
    }

    watch(
      [endpoint, limit, filter, offset],
      () => {
        void load(filter.value, offset.value)
      },
      { immediate: true },
    )

    /**
     * Switches the active filter chip, returning to the first page.
     *
     * @param next - The filter to show.
     */
    const onChangeFilter = (next: NotificationsPageFilter): void => {
      filter.value = next
      offset.value = 0
    }

    /**
     * Marks every notification read (best effort) and reloads the list.
     */
    const onMarkAllRead = async (): Promise<void> => {
      try {
        await http.post(markAllReadEndpoint.value, undefined)
      } catch (_error) {
        // Swallow — mark-all-read is best-effort. The reload below
        // will surface any persistent error via the normal load() path.
      }
      await load(filter.value, offset.value)
    }

    const feedItems = computed(() =>
      items.value.map((notification) => {
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

    const unreadCount = computed(
      () => items.value.filter((notification) => !notification.read).length,
    )

    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))
    const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1)
    const hasPrev = computed(() => offset.value > 0)
    const hasNext = computed(() => offset.value + limit.value < total.value)

    const filterLabels = computed<Record<NotificationsPageFilter, string>>(() => ({
      all: t('notificationsPage.filterAll', {}, { defaultValue: 'All' }),
      unread: t('notificationsPage.filterUnread', {}, { defaultValue: 'Unread' }),
      mentions: t('notificationsPage.filterMentions', {}, { defaultValue: 'Mentions' }),
    }))

    return (): VNode =>
      h(
        'section',
        {
          class: cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 8),
            cm.maxW('4xl'),
            cm.mxAuto,
            cm.stack(6),
            props.className,
          ),
          'data-mol-id': props.dataMolId ?? 'notifications-page',
          'aria-busy': loading.value || undefined,
        },
        [
          h('header', { class: cm.stack(2) }, [
            h(
              'div',
              { class: cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }) },
              [
                h('h1', { class: cm.cn(cm.textSize('3xl'), cm.fontWeight('bold')) }, [
                  t('notificationsPage.title', {}, { defaultValue: 'Notifications' }),
                ]),
                unreadCount.value > 0
                  ? h(
                      'button',
                      {
                        type: 'button',
                        onClick: () => void onMarkAllRead(),
                        'data-mol-id': 'notifications-page-mark-all-read',
                        class: cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          cm.cursorPointer,
                        ),
                      },
                      [
                        t(
                          'notificationsPage.markAllRead',
                          { count: unreadCount.value },
                          { defaultValue: 'Mark {{count}} as read' },
                        ),
                      ],
                    )
                  : null,
              ],
            ),
          ]),
          h(
            'div',
            {
              role: 'tablist',
              'aria-label': t(
                'notificationsPage.filterAriaLabel',
                {},
                { defaultValue: 'Filter notifications' },
              ),
              class: cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
            },
            FILTERS.map((key) => {
              const active = filter.value === key
              return h(
                'button',
                {
                  key,
                  type: 'button',
                  role: 'tab',
                  'aria-selected': active,
                  onClick: () => onChangeFilter(key),
                  'data-mol-id': `notifications-page-filter-${key}`,
                  class: cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('sm'),
                    cm.fontWeight(active ? 'semibold' : 'medium'),
                    cm.cursorPointer,
                  ),
                },
                [filterLabels.value[key]],
              )
            }),
          ),
          error.value
            ? h(
                'div',
                {
                  role: 'alert',
                  'data-mol-id': 'notifications-page-error',
                  class: cm.cn(cm.sp('p', 4), cm.textCenter, cm.textSize('sm')),
                },
                [
                  t(
                    'notificationsPage.error',
                    { message: error.value.message },
                    { defaultValue: 'Could not load notifications.' },
                  ),
                ],
              )
            : loading.value && items.value.length === 0
              ? h(
                  'div',
                  {
                    role: 'status',
                    'aria-live': 'polite',
                    'data-mol-id': 'notifications-page-loading',
                    class: cm.cn(cm.sp('p', 6), cm.textCenter, cm.textSize('sm'), cm.textMuted),
                  },
                  [t('notificationsPage.loading', {}, { defaultValue: 'Loading notifications…' })],
                )
              : feedItems.value.length === 0
                ? h(
                    'div',
                    {
                      'data-mol-id': 'notifications-page-empty',
                      class: cm.cn(cm.sp('p', 8), cm.textCenter, cm.stack(2)),
                    },
                    [
                      h('span', { class: cm.cn(cm.textSize('lg'), cm.fontWeight('semibold')) }, [
                        t(
                          'notificationsPage.emptyTitle',
                          {},
                          { defaultValue: 'You’re all caught up' },
                        ),
                      ]),
                      h('span', { class: cm.cn(cm.textSize('sm'), cm.textMuted) }, [
                        t(
                          'notificationsPage.emptyBody',
                          {},
                          { defaultValue: 'New notifications will appear here.' },
                        ),
                      ]),
                    ],
                  )
                : h(NotificationFeed, {
                    items: feedItems.value,
                    ariaLabel: t(
                      'notificationsPage.feedAriaLabel',
                      {},
                      { defaultValue: 'Notifications' },
                    ),
                    dataMolId: 'notifications-page-feed',
                  }),
          total.value > limit.value
            ? h(
                'nav',
                {
                  'aria-label': t(
                    'notificationsPage.paginationAriaLabel',
                    {},
                    { defaultValue: 'Pagination' },
                  ),
                  class: cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                },
                [
                  h(
                    'button',
                    {
                      type: 'button',
                      disabled: !hasPrev.value,
                      onClick: () => (offset.value = Math.max(0, offset.value - limit.value)),
                      'data-mol-id': 'notifications-page-prev',
                      class: cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        hasPrev.value ? cm.cursorPointer : undefined,
                      ),
                    },
                    [t('notificationsPage.prev', {}, { defaultValue: 'Previous' })],
                  ),
                  h('span', { class: cm.cn(cm.textSize('sm'), cm.textMuted) }, [
                    t(
                      'notificationsPage.pageOf',
                      { current: currentPage.value, total: totalPages.value },
                      { defaultValue: 'Page {{current}} of {{total}}' },
                    ),
                  ]),
                  h(
                    'button',
                    {
                      type: 'button',
                      disabled: !hasNext.value,
                      onClick: () => (offset.value = offset.value + limit.value),
                      'data-mol-id': 'notifications-page-next',
                      class: cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        hasNext.value ? cm.cursorPointer : undefined,
                      ),
                    },
                    [t('notificationsPage.next', {}, { defaultValue: 'Next' })],
                  ),
                ],
              )
            : null,
        ],
      )
  },
})
