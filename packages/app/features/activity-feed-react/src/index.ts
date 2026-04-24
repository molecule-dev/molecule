/**
 * React activity-feed primitives.
 *
 * Exports:
 * - `<ActivityFeed>` — flat vertical list of activity rows.
 * - `<ActivityFeedItem>` — single row (avatar + actor/verb/target + timestamp + body).
 * - `<ActivityFeedGroup>` — heading + list, compose multiple for "Today / Yesterday" feeds.
 * - `ActivityFeedItemData` type for row data.
 *
 * @module
 */

export * from './ActivityFeed.js'
export * from './ActivityFeedGroup.js'
export * from './ActivityFeedItem.js'
export * from './types.js'
