/**
 * Solid activity-feed primitives — the Solid counterpart of
 * `@molecule/app-activity-feed-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * Exports:
 * - `<ActivityFeed>` — flat vertical list of activity rows.
 * - `<ActivityFeedItem>` — single row (avatar + actor/verb/target + timestamp + body).
 * - `<ActivityFeedGroup>` — heading + list, compose multiple for "Today / Yesterday" feeds.
 * - `ActivityFeedItemData` type for row data.
 *
 * @example
 * ```tsx
 * import { ActivityFeed, ActivityFeedGroup } from '@molecule/app-activity-feed-solid'
 *
 * const items = [
 *   { id: '1', actor: 'Alice', verb: 'commented on', target: 'PR #42', timestamp: '2m ago' },
 *   { id: '2', actor: 'Bob', verb: 'closed', target: 'Issue #7', timestamp: '1h ago' },
 * ]
 *
 * export function Activity() {
 *   return (
 *     <>
 *       <ActivityFeed items={items} emptyState={<p>No activity yet.</p>} />
 *       <ActivityFeedGroup heading="Today" items={items} />
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()`); rendering throws otherwise.
 * - Rows are keyed by their `id`, so a re-passed or re-ordered list keeps each
 *   row's DOM the way React's `key` does.
 *
 * @module
 */

export * from './ActivityFeed.jsx'
export * from './ActivityFeedGroup.jsx'
export * from './ActivityFeedItem.jsx'
export * from './types.js'
