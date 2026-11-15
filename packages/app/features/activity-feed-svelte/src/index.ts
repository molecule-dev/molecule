/**
 * Svelte activity-feed primitives — the Svelte counterpart of
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
 * ```svelte
 * <script lang="ts">
 *   import { ActivityFeed, ActivityFeedGroup } from '@molecule/app-activity-feed-svelte'
 *
 *   const items = [
 *     { id: '1', actor: 'Alice', verb: 'commented on', target: 'PR #42', timestamp: '2m ago' },
 *     { id: '2', actor: 'Bob', verb: 'closed', target: 'Issue #7', timestamp: '1h ago' },
 *   ]
 * </script>
 *
 * <!-- Flat feed -->
 * <ActivityFeed {items}>
 *   {#snippet emptyState()}<p>No activity yet.</p>{/snippet}
 * </ActivityFeed>
 *
 * <!-- Grouped by date -->
 * <ActivityFeedGroup heading="Today" {items} />
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()`); rendering throws otherwise.
 * - Node-valued props are snippets (`emptyState`, `footer`, `heading`) or plain
 *   text; row fields accept a snippet or plain text.
 * - Rows are keyed by their `id`, so a re-passed or re-ordered list keeps each
 *   row's DOM the way React's `key` does.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
