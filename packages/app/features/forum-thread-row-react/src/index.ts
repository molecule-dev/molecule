/**
 * Forum / discussion thread row.
 *
 * Exports `<ForumThreadRow>`.
 *
 * @example
 * ```tsx
 * import { ForumThreadRow } from '@molecule/app-forum-thread-row-react'
 *
 * <ForumThreadRow
 *   title="How do I reset my password?"
 *   excerpt="I tried the forgot-password link but never received an email."
 *   voteScore={42}
 *   replyCount={7}
 *   viewCount={320}
 *   author="alice"
 *   createdAt="2 hours ago"
 *   onClick={() => navigate(`/threads/${thread.id}`)}
 * />
 * ```
 * @module
 */

export * from './ForumThreadRow.js'
