/**
 * NotificationsPage component (React parity).
 *
 * @module
 */

import { Component, type OnChanges, type OnInit, signal, type SimpleChanges } from '@angular/core'

import { useHttpClient, useTranslation } from '@molecule/app-angular'
import { type FeedItem, NotificationFeed } from '@molecule/app-notification-feed-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

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
 * NotificationsPage component.
 *
 * Drop-in `/notifications` page used by every flagship app. The host IS the
 * outer `<section>` (`section[mol-notifications-page]`), matching React's root
 * exactly, with the same ClassMap tokens, `data-mol-id` and `aria-busy`.
 *
 * Composes `<NotificationFeed>` with a header (title + mark-all-read action),
 * a row of filter chips (all / unread / mentions), a paginated body, and an
 * empty state. All data is loaded over the HTTP bond, and all UI text flows
 * through `t()` so apps can localise via the companion locale bond
 * `@molecule/app-locales-notifications-page`.
 *
 * The list reloads exactly where React's effect does: on mount, when
 * `pageSize` or `endpoint` changes, and whenever the filter chip or the page
 * changes. An icon override re-renders the rows and refetches nothing.
 */
@Component({
  selector: 'section[mol-notifications-page]',
  standalone: true,
  imports: [NotificationFeed],
  inputs: ['pageSize', 'endpoint', 'markAllReadEndpoint', 'typeIcons', 'className', 'dataMolId'],
  host: {
    '[class]': 'rootClasses()',
    '[attr.data-mol-id]': 'dataMolId ?? "notifications-page"',
    '[attr.aria-busy]': 'loading() ? "true" : null',
  },
  // prettier-ignore
  template: `<header [class]="cm.stack(2)">
      <div [class]="cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })">
        <h1 [class]="cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))">
          {{ t('notificationsPage.title', {}, { defaultValue: 'Notifications' }) }}
        </h1>
        @if (unreadCount() > 0) {
          <button
            type="button"
            (click)="onMarkAllRead()"
            data-mol-id="notifications-page-mark-all-read"
            [class]="cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.cursorPointer)"
          >
            {{ markAllReadLabel() }}
          </button>
        }
      </div>
    </header>
    <div
      role="tablist"
      [attr.aria-label]="
        t('notificationsPage.filterAriaLabel', {}, { defaultValue: 'Filter notifications' })
      "
      [class]="cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })"
    >
      @for (key of filters; track key) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="filter() === key"
          (click)="onChangeFilter(key)"
          [attr.data-mol-id]="'notifications-page-filter-' + key"
          [class]="filterClasses(key)"
        >
          {{ filterLabels()[key] }}
        </button>
      }
    </div>
    @if (error(); as failure) {
      <div
        role="alert"
        data-mol-id="notifications-page-error"
        [class]="cm.cn(cm.sp('p', 4), cm.textCenter, cm.textSize('sm'))"
      >
        {{ t('notificationsPage.error', { message: failure.message }, { defaultValue: 'Could not load notifications.' }) }}
      </div>
    } @else if (loading() && items().length === 0) {
      <div
        role="status"
        aria-live="polite"
        data-mol-id="notifications-page-loading"
        [class]="cm.cn(cm.sp('p', 6), cm.textCenter, cm.textSize('sm'), cm.textMuted)"
      >
        {{ t('notificationsPage.loading', {}, { defaultValue: 'Loading notifications…' }) }}
      </div>
    } @else if (feedItems().length === 0) {
      <div
        data-mol-id="notifications-page-empty"
        [class]="cm.cn(cm.sp('p', 8), cm.textCenter, cm.stack(2))"
      >
        <span [class]="cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))">
          {{ t('notificationsPage.emptyTitle', {}, { defaultValue: 'You’re all caught up' }) }}
        </span>
        <span [class]="cm.cn(cm.textSize('sm'), cm.textMuted)">
          {{ t('notificationsPage.emptyBody', {}, { defaultValue: 'New notifications will appear here.' }) }}
        </span>
      </div>
    } @else {
      <ul
        mol-notification-feed
        [items]="feedItems()"
        [ariaLabel]="t('notificationsPage.feedAriaLabel', {}, { defaultValue: 'Notifications' })"
        [dataMolId]="'notifications-page-feed'"
      ></ul>
    }
    @if (total() > limit()) {
      <nav
        [attr.aria-label]="
          t('notificationsPage.paginationAriaLabel', {}, { defaultValue: 'Pagination' })
        "
        [class]="cm.flex({ align: 'center', justify: 'between', gap: 'sm' })"
      >
        <button
          type="button"
          [disabled]="!hasPrev()"
          (click)="goPrev()"
          data-mol-id="notifications-page-prev"
          [class]="pageButtonClasses(hasPrev())"
        >
          {{ t('notificationsPage.prev', {}, { defaultValue: 'Previous' }) }}
        </button>
        <span [class]="cm.cn(cm.textSize('sm'), cm.textMuted)">{{ pageOfLabel() }}</span>
        <button
          type="button"
          [disabled]="!hasNext()"
          (click)="goNext()"
          data-mol-id="notifications-page-next"
          [class]="pageButtonClasses(hasNext())"
        >
          {{ t('notificationsPage.next', {}, { defaultValue: 'Next' }) }}
        </button>
      </nav>
    }`,
})
export class NotificationsPage implements OnChanges, OnInit {
  /** Items per page (React's default is `20`, applied at read time). */
  pageSize?: number
  /** Override the URL that is fetched for the notifications list. */
  endpoint?: string
  /** Override the URL hit by the "Mark all as read" action. */
  markAllReadEndpoint?: string
  /** Optional `type → icon` overrides. */
  typeIcons?: NotificationsPageTypeIconMap
  /** Extra classes appended to the outer page wrapper. */
  className?: string
  /** `data-mol-id` selector for AI-agent interaction. */
  dataMolId?: string

  /** Reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  private readonly http = useHttpClient()

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The filter chips, in React's order. */
  protected readonly filters = FILTERS

  /** The active filter chip. */
  protected readonly filter = signal<NotificationsPageFilter>('all')
  /** Items skipped before the current page. */
  protected readonly offset = signal(0)
  /** The current page's rows. */
  protected readonly items = signal<NotificationsPageItem[]>([])
  /** Total matching rows across all pages. */
  protected readonly total = signal(0)
  /** Whether a request is in flight. */
  protected readonly loading = signal(true)
  /** The last request's failure, if any. */
  protected readonly error = signal<Error | null>(null)

  /**
   * Loads the first page (React's mount effect). A change description comes
   * first for a component mounted with inputs; the initial load is left here,
   * so a mount without any bound input still loads exactly once.
   */
  ngOnInit(): void {
    void this.load(this.filter(), this.offset())
  }

  /**
   * Reloads when the query changes, as React's effect does: it depends on
   * `endpoint` and `pageSize` only, so an icon override must not refetch the
   * list. The first change description belongs to {@link ngOnInit}.
   *
   * @param changes - The inputs that changed.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (Object.values(changes).some((change) => change.firstChange)) return
    if ('pageSize' in changes || 'endpoint' in changes) void this.load(this.filter(), this.offset())
  }

  /**
   * Items per page.
   * @returns The page size (React's default `20`).
   */
  protected limit(): number {
    return this.pageSize ?? DEFAULT_PAGE_SIZE
  }

  /**
   * The number of unread rows on this page.
   * @returns The unread count.
   */
  protected unreadCount(): number {
    return this.items().filter((notification) => !notification.read).length
  }

  /**
   * The rows the feed renders, with their resolved icon and link.
   * @returns The feed's items.
   */
  protected feedItems(): ReadonlyArray<FeedItem> {
    return this.items().map((notification) => {
      const href =
        typeof notification.data?.href === 'string' && notification.data.href.length > 0
          ? notification.data.href
          : null
      return {
        id: notification.id,
        icon: resolveTypeIcon(notification.type, this.typeIcons),
        title: notification.title,
        body: notification.body,
        createdAt: notification.createdAt,
        href,
        unread: !notification.read,
      }
    })
  }

  /**
   * Total pages, at least one.
   * @returns The page count.
   */
  protected totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit()))
  }

  /**
   * The current page number, one-based.
   * @returns The current page.
   */
  protected currentPage(): number {
    return Math.floor(this.offset() / this.limit()) + 1
  }

  /**
   * Whether a previous page exists.
   * @returns True with an earlier page.
   */
  protected hasPrev(): boolean {
    return this.offset() > 0
  }

  /**
   * Whether a next page exists.
   * @returns True with a later page.
   */
  protected hasNext(): boolean {
    return this.offset() + this.limit() < this.total()
  }

  /**
   * The localised filter chip labels.
   * @returns One label per chip.
   */
  protected filterLabels(): Record<NotificationsPageFilter, string> {
    return {
      all: this.t('notificationsPage.filterAll', {}, { defaultValue: 'All' }),
      unread: this.t('notificationsPage.filterUnread', {}, { defaultValue: 'Unread' }),
      mentions: this.t('notificationsPage.filterMentions', {}, { defaultValue: 'Mentions' }),
    }
  }

  /**
   * The outer class list.
   * @returns The class string.
   */
  protected rootClasses(): string {
    return this.cm.cn(
      this.cm.sp('px', 6),
      this.cm.sp('py', 8),
      this.cm.maxW('4xl'),
      this.cm.mxAuto,
      this.cm.stack(6),
      this.className,
    )
  }

  /**
   * One filter chip's class list.
   * @param key - The chip's filter.
   * @returns The class string.
   */
  protected filterClasses(key: NotificationsPageFilter): string {
    const active = this.filter() === key
    return this.cm.cn(
      this.cm.sp('px', 3),
      this.cm.sp('py', 1),
      this.cm.textSize('sm'),
      this.cm.fontWeight(active ? 'semibold' : 'medium'),
      this.cm.cursorPointer,
    )
  }

  /**
   * A pagination button's class list.
   * @param enabled - Whether the button navigates.
   * @returns The class string.
   */
  protected pageButtonClasses(enabled: boolean): string {
    return this.cm.cn(
      this.cm.textSize('sm'),
      this.cm.fontWeight('semibold'),
      enabled ? this.cm.cursorPointer : undefined,
    )
  }

  /**
   * The mark-all-read label, with this page's unread count.
   * @returns The translated label.
   */
  protected markAllReadLabel(): string {
    return this.t(
      'notificationsPage.markAllRead',
      { count: this.unreadCount() },
      { defaultValue: 'Mark {{count}} as read' },
    )
  }

  /**
   * The pagination position label.
   * @returns The translated label.
   */
  protected pageOfLabel(): string {
    return this.t(
      'notificationsPage.pageOf',
      { current: this.currentPage(), total: this.totalPages() },
      { defaultValue: 'Page {{current}} of {{total}}' },
    )
  }

  /**
   * Switches the active filter chip, returning to the first page. An
   * unchanged chip and page change nothing, as React's state writes do not.
   * @param next - The filter to show.
   */
  protected onChangeFilter(next: NotificationsPageFilter): void {
    if (this.filter() === next && this.offset() === 0) return
    this.filter.set(next)
    this.offset.set(0)
    void this.load(next, 0)
  }

  /** Moves to the previous page. */
  protected goPrev(): void {
    const next = Math.max(0, this.offset() - this.limit())
    if (next === this.offset()) return
    this.offset.set(next)
    void this.load(this.filter(), next)
  }

  /** Moves to the next page. */
  protected goNext(): void {
    const next = this.offset() + this.limit()
    if (next === this.offset()) return
    this.offset.set(next)
    void this.load(this.filter(), next)
  }

  /** Marks every notification read (best effort) and reloads the list. */
  protected async onMarkAllRead(): Promise<void> {
    try {
      await this.http.post(this.markAllReadEndpoint ?? DEFAULT_MARK_ALL_READ_ENDPOINT, undefined)
    } catch (_error) {
      // Swallow — mark-all-read is best-effort. The reload below
      // will surface any persistent error via the normal load() path.
    }
    await this.load(this.filter(), this.offset())
  }

  /**
   * The newest load's id. A response for an older query is dropped, so a
   * slow earlier page cannot replace the page now on screen (React's
   * effect cleanup `ignore` flag).
   */
  private loadId = 0

  /**
   * Loads one page, keeping the rows already shown while the request is in
   * flight (React's `setState((prev) => …)`).
   *
   * @param nextFilter - The filter chip to query with.
   * @param nextOffset - Items to skip.
   */
  private async load(nextFilter: NotificationsPageFilter, nextOffset: number): Promise<void> {
    const id = ++this.loadId
    this.loading.set(true)
    this.error.set(null)
    try {
      const url = `${this.endpoint ?? DEFAULT_ENDPOINT}${buildQuery(nextFilter, nextOffset, this.limit())}`
      const response = await this.http.get<NotificationsPageResult>(url)
      if (id !== this.loadId) return
      this.items.set(response.data.items)
      this.total.set(response.data.total)
      this.loading.set(false)
    } catch (caught) {
      if (id !== this.loadId) return
      this.error.set(caught instanceof Error ? caught : new Error(String(caught)))
      this.items.set([])
      this.total.set(0)
      this.loading.set(false)
    }
  }
}
