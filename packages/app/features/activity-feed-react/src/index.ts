/**
 * React activity-feed primitives.
 *
 * Exports:
 * - `<ActivityFeed>` — flat vertical list of activity rows.
 * - `<ActivityFeedItem>` — single row (avatar + actor/verb/target + timestamp + body).
 * - `<ActivityFeedGroup>` — heading + list, compose multiple for "Today / Yesterday" feeds.
 * - `ActivityFeedItemData` type for row data.
 *
 * @example
 * ```tsx
 * import type { ActivityFeedItemData } from '@molecule/app-activity-feed-react'
 * import { ActivityFeed } from '@molecule/app-activity-feed-react'
 * import { t } from '@molecule/app-i18n'
 *
 * export function ActivityPage() {
 *   const items: ActivityFeedItemData[] = [
 *     { id: 'a1', actor: 'Alice', verb: 'commented on', target: 'PR #42', timestamp: '2m ago', body: 'Looks good to me.' },
 *     { id: 'a2', actor: 'Bob', verb: 'closed', target: 'Issue #7', timestamp: '1h ago', avatarSrc: '/avatars/bob.png' },
 *   ]
 *   return (
 *     <ActivityFeed
 *       items={items}
 *       emptyState={<p>{t('notifications.empty', undefined, { defaultValue: 'No notifications' })}</p>}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Needs a ClassMap bond.** Every component styles itself via `getClassMap()`, which throws
 *   unless the app called `setClassMap(classMap)` (from `@molecule/app-ui`, e.g. with
 *   `@molecule/app-ui-tailwind`) at startup. Avatars render `Avatar` from `@molecule/app-ui-react`.
 * - Purely presentational: it does NOT fetch, sort, group, or format times. Pass items already in
 *   display order and `timestamp` already formatted ("2m ago") — an ISO string renders verbatim.
 * - `emptyState` only renders when `items` is empty; without it an empty feed is an empty `<div>`.
 *   For "Today / Yesterday" sections, render several `<ActivityFeedGroup heading items>` — the
 *   grouping itself is yours to compute.
 * - `icon` replaces the avatar when both are set; with neither, the leading slot is empty.
 *
 * @module
 */

export * from './ActivityFeed.js'
export * from './ActivityFeedGroup.js'
export * from './ActivityFeedItem.js'
export * from './types.js'
