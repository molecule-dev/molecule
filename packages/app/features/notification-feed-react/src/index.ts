/**
 * Vertical notification feed.
 *
 * Exports `<NotificationFeed>` — a list of notification rows with typed
 * icon, title, body, relative time, and unread indicator. Optionally wraps
 * each row in a Link if the notification has an href.
 *
 * @example
 * ```tsx
 * import { type FeedItem, NotificationFeed } from '@molecule/app-notification-feed-react'
 *
 * const ICON_BY_TYPE: Record<string, string> = { deploy: 'check_circle', comment: 'chat' }
 * const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()
 *
 * export function ActivityFeed() {
 *   const notifications = [
 *     { id: 'n1', type: 'deploy', title: 'Build succeeded', body: 'main deployed to prod', createdAt: minutesAgo(12), read: false, url: '/deployments/42' },
 *     { id: 'n2', type: 'comment', title: 'New comment', body: 'Alice commented on PR #17', createdAt: minutesAgo(180), read: true, url: null },
 *   ]
 *   const items: FeedItem[] = notifications.map((n) => ({
 *     id: n.id,
 *     icon: ICON_BY_TYPE[n.type] ?? 'notifications',
 *     title: n.title,
 *     body: n.body,
 *     createdAt: n.createdAt, // ISO string → rendered as "12m" / "3h" / "5d"
 *     unread: !n.read,
 *     href: n.url, // rows with href render a react-router <Link>
 *   }))
 *   return <NotificationFeed items={items} ariaLabel="Notifications" dataMolId="notification-feed" />
 * }
 * ```
 *
 * @remarks
 * `FeedItem.icon` is a Material Symbols LIGATURE — the app must load the
 * "Material Symbols Outlined" font and define the
 * `material-symbols-outlined` CSS class, or icon names render as plain
 * text (the literal string `check_circle`). The icon circle background
 * and the unread left-border accent additionally rely on raw Tailwind
 * utilities (`bg-primary-container`, `border-l-4`) that standard
 * molecule scaffolds neither scan nor theme — add an `@source` line for
 * this package's dist plus a `primary-container` theme color, or expect
 * both to be invisible until the package is migrated to ClassMap.
 *
 * Rows WITH `href` render a react-router `<Link>` — they THROW outside a
 * `<Router>` context. In apps not using react-router, omit `href` (rows
 * render as plain divs) or handle navigation on a wrapping element.
 * Requires a wired ClassMap bond — `getClassMap()` throws before wiring.
 *
 * It is display-only: no click handler, no mark-as-read, no empty state (an empty `items`
 * renders an empty `<ul>` — render your own "No notifications" message), and no fetching.
 * `createdAt` must be an ISO string, not a `Date` or epoch number.
 *
 * `fmtRelativeShort` (exported) renders compact `12m` / `3h` / `5d`
 * strings with English unit letters — swap in your own formatter for
 * localized feeds by pre-formatting and rendering your own rows.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] The feed renders real notifications with icon, title, body, and a
 *   relative time — no `undefined` fields or raw timestamps.
 * - [ ] Unread rows are visibly distinct, and any unread badge/count matches
 *   the number of unread rows.
 * - [ ] Clicking a notification that carries an href navigates to its target.
 * - [ ] Marking as read (however this app wires it) clears the unread state
 *   and it stays cleared after a full reload.
 * - [ ] Performing an action the app notifies about adds a new notification to
 *   the feed (newest first).
 * - [ ] An empty feed shows a readable empty state — not a blank panel.
 *
 * @module
 */

export * from './fmtRelativeShort.js'
export * from './NotificationFeed.js'
