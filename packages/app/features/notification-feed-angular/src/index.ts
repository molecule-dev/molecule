/**
 * Angular vertical notification feed.
 *
 * Exports `<NotificationFeed>` — the Angular counterpart of
 * `@molecule/app-notification-feed-react`, with the same props and the same
 * DOM: a list of notification rows with typed icon, title, body, relative
 * time, and unread indicator, each row optionally wrapped in a link.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { NotificationFeed } from '@molecule/app-notification-feed-angular'
 *
 * @Component({
 *   selector: 'app-feed',
 *   standalone: true,
 *   imports: [NotificationFeed],
 *   template: `<ul
 *     mol-notification-feed
 *     [items]="items"
 *     ariaLabel="Notifications"
 *     dataMolId="notification-feed"
 *   ></ul>`,
 * })
 * export class Feed {
 *   items = [
 *     { id: '1', icon: 'check_circle', title: 'Build succeeded', body: 'main branch deployed to prod', createdAt: '2024-06-01T09:00:00Z', unread: true, href: '/deployments/42' },
 *     { id: '2', icon: 'chat', title: 'New comment', body: 'Alice left a comment on PR #17', createdAt: '2024-06-01T08:30:00Z' },
 *   ]
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
 * Rows WITH `href` render the binding's `Link` (`<a molLink>`,
 * react-router's `<Link to>` contract) — it navigates through the router the
 * app's molecule context mounts, and needs that router. In apps without one,
 * omit `href` (rows render as plain divs) or handle navigation on a wrapping
 * element. Requires a wired ClassMap bond — `getClassMap()` throws before
 * wiring.
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
export * from './notification-feed.component.js'
export * from './types.js'
