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
 * import { ActivityFeed, ActivityFeedGroup } from '@molecule/app-activity-feed-react'
 *
 * const items = [
 *   { id: '1', actor: 'Alice', verb: 'commented on', target: 'PR #42', timestamp: '2m ago' },
 *   { id: '2', actor: 'Bob', verb: 'closed', target: 'Issue #7', timestamp: '1h ago' },
 * ]
 *
 * // Flat feed
 * <ActivityFeed items={items} emptyState={<p>No activity yet.</p>} />
 *
 * // Grouped by date
 * <ActivityFeedGroup heading="Today" items={items} />
 * ```
 *
 * @module
 */

export * from './ActivityFeed.js'
export * from './ActivityFeedGroup.js'
export * from './ActivityFeedItem.js'
export * from './types.js'
