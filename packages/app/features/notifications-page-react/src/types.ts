/**
 * Public types for `@molecule/app-notifications-page-react`.
 *
 * @module
 */

/**
 * A single notification record as returned by `GET /notifications`
 * from `@molecule/api-resource-notification`.
 *
 * Mirrors the core `Notification` shape from
 * `@molecule/api-notification-center` minus implementation-specific
 * fields (Date is serialised to string ISO across the wire).
 */
export interface NotificationsPageItem {
  /** Provider-assigned notification identifier. */
  id: string
  /** Notification category (`system`, `message`, `mention`, etc.). */
  type: string
  /** Notification headline. */
  title: string
  /** Notification body text. */
  body: string
  /** Whether the notification has been read. */
  read: boolean
  /** ISO 8601 timestamp the notification was created at. */
  createdAt: string
  /**
   * Optional structured payload attached by the producer.
   *
   * The page component reads `data.href` (string) when present and
   * forwards it to the underlying feed row so the row becomes a link.
   */
  data?: Record<string, unknown>
}

/**
 * Paginated response shape returned by `GET /notifications`.
 */
export interface NotificationsPageResult {
  /** The notifications on the current page. */
  items: NotificationsPageItem[]
  /** Total number of matching notifications across all pages. */
  total: number
  /** Number of items skipped before this page. */
  offset: number
  /** Maximum number of items per page. */
  limit: number
}

/**
 * Filter chips shown above the notification list.
 *
 * - `'all'` shows every notification (read + unread, every type).
 * - `'unread'` keeps only `read === false`.
 * - `'mentions'` keeps only `type === 'mention'`.
 */
export type NotificationsPageFilter = 'all' | 'unread' | 'mentions'

/**
 * Maps `Notification.type` values to material-symbol icon names so the
 * underlying `<NotificationFeed>` can render the right glyph.
 *
 * Defaults are provided for the most common types; consumers can extend
 * or replace the map by passing the `typeIcons` prop.
 */
export type NotificationsPageTypeIconMap = Readonly<Record<string, string>>

/**
 * Props for `<NotificationsPage>`.
 */
export interface NotificationsPageProps {
  /** Items per page. Defaults to `20`. */
  pageSize?: number
  /**
   * Override the URL that is fetched for the notifications list.
   * Defaults to `/api/notifications`.
   *
   * Useful when the API is mounted at a non-standard prefix.
   */
  endpoint?: string
  /**
   * Override the URL hit by the "Mark all as read" action.
   * Defaults to `/api/notifications/read-all`.
   */
  markAllReadEndpoint?: string
  /**
   * Optional `type → icon` overrides. Merged on top of the default map.
   */
  typeIcons?: NotificationsPageTypeIconMap
  /** Extra classes appended to the outer page wrapper. */
  className?: string
  /** `data-mol-id` selector for AI-agent interaction. */
  dataMolId?: string
}
