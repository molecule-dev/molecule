/**
 * Notification center core interface for molecule.dev.
 *
 * Provides a framework-agnostic contract for in-app notification center widgets
 * with paginated fetching, read/unread tracking, realtime push updates, polling,
 * and subscription-based state notifications. Bond a provider (e.g.
 * `@molecule/app-notification-center-default`) at startup, then use
 * {@link createNotificationCenter} anywhere.
 *
 * @example
 * ```typescript
 * import { setProvider, createNotificationCenter } from '@molecule/app-notification-center'
 * import { provider } from '@molecule/app-notification-center-default'
 *
 * setProvider(provider)
 *
 * const center = createNotificationCenter({
 *   fetchNotifications: (opts) => api.get('/notifications', opts),
 *   fetchUnreadCount: () => api.get('/notifications/unread-count'),
 *   markAsRead: (id) => api.post(`/notifications/${id}/read`),
 *   markAllAsRead: () => api.post('/notifications/read-all'),
 *   pollInterval: 30_000,
 * })
 *
 * center.onUpdate((state) => {
 *   console.log('Unread:', state.unreadCount)
 * })
 * ```
 *
 * @remarks
 * `NotificationCenterState.lastError` is the error surface for a failed
 * `refresh()` / `loadMore()` / `poll()` attempt. Without it, a provider that
 * documents fetch failures as a silent noop renders a FIRST-load failure
 * identically to "you have no notifications" — both are an empty list with
 * `loading: false`, and a consumer UI cannot tell "network/server error"
 * from "genuinely empty" or show a retry banner.
 *
 * Provider implementations (e.g. `@molecule/app-notification-center-default`)
 * MUST populate `lastError` in their fetch catch blocks and clear it
 * (`lastError: undefined`) on the next successful fetch — it is not a
 * sticky banner that survives a later success. Framework bindings (e.g.
 * `@molecule/app-notification-center-react`) should read this field to
 * render a retry affordance instead of a bare empty state.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Unread notifications render with a distinct unread treatment vs read
 *   ones, and the unread badge/count (`unreadCount` / `getUnreadCount()`)
 *   exactly equals the number of loaded AppNotifications with `read: false`.
 * - [ ] Clicking a notification navigates to its own `actionUrl` (its target,
 *   not a shared/hardcoded route) AND marks it read (`markAsRead(id)`): its
 *   `read` flag flips, it loses the unread treatment, and the badge decrements
 *   by one — and that stays after a full reload (persisted server-side, not
 *   just local state).
 * - [ ] `markAllAsRead()` drops the unread badge to 0 and NO remaining item
 *   still shows the unread treatment; the cleared state survives a reload.
 * - [ ] Applying a filter (unread-only via `NotificationFilter.read` / by-type
 *   via `NotificationFilter.type`, passed as `FetchOptions.filter`) renders
 *   ONLY matching notifications and the visible count reflects the filter
 *   honestly — no read items leak into an unread-only view.
 * - [ ] Load-more / pagination (`loadMore()` following `PaginatedResult.hasMore`
 *   + `nextCursor`) appends OLDER notifications to the list with zero
 *   duplicates — every rendered `id` is unique — and the control stops once
 *   `hasMore` is false.
 * - [ ] A notification pushed over the realtime transport
 *   (`NotificationRealtimeAdapter` wired via `realtime` / `realtimeEvent`,
 *   surfaced through `onNotification`) appears at the TOP of the list and bumps
 *   the unread badge WITHOUT any manual reload or refetch.
 * - [ ] With zero notifications the panel shows a real empty state (not a blank
 *   or broken widget), and that empty state is visibly distinct from a failed
 *   fetch — a `lastError` renders a retry affordance, never a silent "empty".
 * - [ ] A user sees ONLY their own notifications: an `id` belonging to another
 *   user is never listed, and cannot be reached via `markAsRead(id)` or the
 *   click-through `actionUrl` (no cross-user read/navigation).
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
