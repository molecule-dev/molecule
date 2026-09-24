/**
 * Forum / discussion-board thread row — title, optional excerpt, vote score,
 * reply/view counts, pin/lock badges, author, timestamp, and an optional
 * `voteControls` slot for inline up/down buttons.
 *
 * @example
 * ```tsx
 * import { ForumThreadRow } from '@molecule/app-forum-thread-row-react'
 *
 * const threads = [
 *   { id: 't1', title: 'Forum rules — read first', votes: 120, replies: 0, views: 5400, author: 'mod', createdAt: 'Jan 2', pinned: true, locked: true },
 *   { id: 't2', title: 'How do I reset my password?', excerpt: 'The reset email never arrives.', votes: 42, replies: 7, views: 320, author: 'alice', createdAt: '2 hours ago' },
 * ]
 *
 * export function ForumIndex() {
 *   return (
 *     <section>
 *       {threads.map((thread) => (
 *         <ForumThreadRow
 *           key={thread.id}
 *           title={<a href={`/forum/${thread.id}`}>{thread.title}</a>}
 *           excerpt={thread.excerpt}
 *           voteScore={thread.votes}
 *           replyCount={thread.replies}
 *           viewCount={thread.views}
 *           author={thread.author}
 *           createdAt={thread.createdAt}
 *           pinned={thread.pinned}
 *           locked={thread.locked}
 *         />
 *       ))}
 *     </section>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Display-only: it does not fetch threads, vote, or navigate. `onClick`
 *   lands on a plain `<article>` (no role, not focusable, no Enter key) —
 *   make the `title` a real link for keyboard/screen-reader users.
 * - `voteScore` is HIDDEN when `voteControls` is passed — render the score
 *   inside your own controls. `createdAt` is shown as given (format it
 *   yourself); counts are raw numbers with no pluralisation (`1 replies`).
 * - Styling routes through `getClassMap()` — a ClassMap bond
 *   (e.g. `@molecule/app-ui-tailwind`) must be wired or rendering throws.
 * - KNOWN GAP: the counter labels ("votes", "replies", "views") and the
 *   pin/lock aria-labels are hardcoded English (there is no companion locale
 *   bond yet). For localized apps, pass pre-formatted content via `tags` /
 *   `voteControls` or wrap the row until the package routes text through `t()`.
 * - The row has no `data-mol-id` support yet; add your own wrapper attribute
 *   if AI-agent/e2e selectors need to target it.
 *
 * @module
 */

export * from './ForumThreadRow.js'
