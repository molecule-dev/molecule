/**
 * Vue activity-feed primitives — the Vue counterpart of
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
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { ActivityFeed, ActivityFeedGroup } from '@molecule/app-activity-feed-vue'
 *
 * const items = [
 *   { id: '1', actor: 'Alice', verb: 'commented on', target: 'PR #42', timestamp: '2m ago' },
 *   { id: '2', actor: 'Bob', verb: 'closed', target: 'Issue #7', timestamp: '1h ago' },
 * ]
 *
 * const Feed = defineComponent({
 *   setup() {
 *     return () =>
 *       h('div', [
 *         // Flat feed
 *         h(ActivityFeed, { items }, { emptyState: () => [h('p', 'No activity yet.')] }),
 *         // Grouped by date
 *         h(ActivityFeedGroup, { heading: 'Today', items }),
 *       ])
 *   },
 * })
 *
 * createApp(Feed).mount('#app')
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()`); rendering throws otherwise.
 * - Node-valued props (`emptyState`, `footer`, `heading`) arrive as a prop AND a
 *   same-named slot — the component accepts either, the slot winning.
 * - Rows are keyed by their `id`, so a re-passed or re-ordered list keeps each
 *   row's DOM the way React's `key` does.
 *
 * @module
 */

export * from './ActivityFeed.js'
export * from './ActivityFeedGroup.js'
export * from './ActivityFeedItem.js'
export * from './types.js'
