/**
 * Angular forum / discussion-board thread row — the counterpart of
 * `@molecule/app-forum-thread-row-react`: the same props and the same DOM for
 * the same input.
 *
 * Exports `ForumThreadRow` — title, optional excerpt, vote score, reply/view
 * counts, pin/lock badges, author, timestamp, tag chips, and an optional
 * `voteControls` slot for inline up/down buttons.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { ForumThreadRow } from '@molecule/app-forum-thread-row-angular'
 *
 * @Component({
 *   selector: 'app-thread',
 *   standalone: true,
 *   imports: [ForumThreadRow],
 *   template: `
 *     <article
 *       mol-forum-thread-row
 *       title="How do I reset my password?"
 *       excerpt="I tried the forgot-password link but never received an email."
 *       [voteScore]="42"
 *       [replyCount]="7"
 *       [viewCount]="320"
 *       author="alice"
 *       createdAt="2 hours ago"
 *       [onClick]="openThread"
 *     >
 *       <span slot="tags">help</span>
 *     </article>
 *   `,
 * })
 * export class Thread {
 *   openThread(): void {
 *     // navigate to the thread…
 *   }
 * }
 * ```
 *
 * @remarks
 * - Styling routes through `getClassMap()` — a ClassMap bond (e.g.
 *   `@molecule/app-ui-tailwind`) must be wired or rendering throws.
 * - KNOWN GAP (same as React): the counter labels ("votes", "replies",
 *   "views") and the pin/lock aria-labels are hardcoded English (there is no
 *   companion locale bond yet). For localized apps, pass pre-formatted content
 *   via `tags` / `voteControls` or wrap the row until the package routes text
 *   through `t()`.
 * - The row has no `data-mol-id` support yet; add your own wrapper attribute
 *   if AI-agent/e2e selectors need to target it.
 * - Node-valued props are projected content: `title`, `excerpt`, `author`,
 *   `createdAt`, `tags` and `voteControls` are selected by `[slot=<name>]`;
 *   string inputs render as text with React's truthiness branch (an empty
 *   string renders nothing).
 *
 * @module
 */

export * from './forum-thread-row.component.js'
export * from './types.js'
