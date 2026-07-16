/**
 * Forum / discussion-board thread row — title, optional excerpt, vote score,
 * reply/view counts, pin/lock badges, author, timestamp, and an optional
 * `voteControls` slot for inline up/down buttons.
 *
 * @example
 * ```tsx
 * import { ForumThreadRow } from '@molecule/app-forum-thread-row-react'
 *
 * const thread = { id: 't1', title: 'How do I reset my password?' }
 *
 * <ForumThreadRow
 *   title={thread.title}
 *   excerpt="I tried the forgot-password link but never received an email."
 *   voteScore={42}
 *   replyCount={7}
 *   viewCount={320}
 *   author="alice"
 *   createdAt="2 hours ago"
 *   onClick={() => console.log('open thread', thread.id)}
 * />
 * ```
 *
 * @remarks
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
