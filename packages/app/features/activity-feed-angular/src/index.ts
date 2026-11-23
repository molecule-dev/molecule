/**
 * Angular activity-feed primitives — the counterpart of
 * `@molecule/app-activity-feed-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * Exports:
 * - `<mol-activity-feed>` — flat vertical list of activity rows.
 * - `<article mol-activity-feed-item>` — single row (avatar + actor/verb/target + timestamp + body).
 * - `<section mol-activity-feed-group>` — heading + list, compose multiple for "Today / Yesterday" feeds.
 * - `ActivityFeedItemData` type for row data.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import {
 *   ActivityFeed,
 *   ActivityFeedGroup,
 *   ActivityFeedItem,
 * } from '@molecule/app-activity-feed-angular'
 *
 * @Component({
 *   selector: 'app-activity',
 *   standalone: true,
 *   imports: [ActivityFeed, ActivityFeedGroup, ActivityFeedItem],
 *   template: `
 *     <mol-activity-feed [items]="items">
 *       <p slot="emptyState">No activity yet.</p>
 *     </mol-activity-feed>
 *
 *     <section mol-activity-feed-group heading="Today" [items]="items"></section>
 *   `,
 * })
 * export class Activity {
 *   items = [
 *     { id: '1', actor: 'Alice', verb: 'commented on', target: 'PR #42', timestamp: '2m ago' },
 *     { id: '2', actor: 'Bob', verb: 'closed', target: 'Issue #7', timestamp: '1h ago' },
 *   ]
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()`); rendering throws otherwise.
 * - `ActivityFeed`'s root is the wrapper `<div>` — or the bare empty state when
 *   the list is empty — so it renders exactly those nodes with no host element
 *   of its own.
 * - Node props are projected content: `[slot=emptyState]`, `[slot=footer]`,
 *   `[slot=heading]`; a row's node fields are template references.
 *
 * @module
 */

export * from './activity-feed.component.js'
export * from './activity-feed-group.component.js'
export * from './activity-feed-item.component.js'
export * from './types.js'
