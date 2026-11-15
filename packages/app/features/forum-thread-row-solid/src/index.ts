/**
 * Solid forum / discussion-board thread row.
 *
 * Exports `ForumThreadRow` — title, optional excerpt, vote score, reply/view
 * counts, pin/lock badges, author, timestamp, and an optional `voteControls`
 * slot for inline up/down buttons. It is the Solid counterpart of
 * `@molecule/app-forum-thread-row-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { ForumThreadRow } from '@molecule/app-forum-thread-row-solid'
 *
 * declare function openThread(): void
 *
 * <ForumThreadRow
 *   title="How do I reset my password?"
 *   excerpt="I tried the forgot-password link but never received an email."
 *   voteScore={42}
 *   replyCount={7}
 *   viewCount={320}
 *   author="alice"
 *   createdAt="2 hours ago"
 *   onClick={openThread}
 * />
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
 *
 * @module
 */

export * from './ForumThreadRow.jsx'
export * from './types.js'
