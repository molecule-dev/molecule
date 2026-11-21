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
 * - The row's own text — the "Pinned" / "Locked" marker labels (announced
 *   through `role="img"` + `aria-label`), the "votes" label and the
 *   "{{count}} replies" / "{{count}} views" counters — goes through `t()`
 *   with those English defaults. Register the companion bond
 *   `@molecule/app-locales-forum-thread-row` to localize it; everything the
 *   caller passes (`title`, `excerpt`, `author`, `createdAt`, `tags`,
 *   `voteControls`) renders as given.
 * - The row's open button carries `data-mol-id="forum-thread-row-open"`; the
 *   root has no `data-mol-id` prop yet — add your own wrapper attribute if
 *   AI-agent/e2e selectors need to target the row itself.
 *
 * @module
 */

export * from './ForumThreadRow.js'
