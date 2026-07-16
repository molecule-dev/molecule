/**
 * Reddit/HN-style vote cluster — stacked up/down arrows + score readout.
 *
 * Used by link-aggregator and news-aggregator templates, and composable
 * inside `@molecule/app-forum-thread-row-react`. Toggle semantics handle
 * upvote, downvote, and "click again to clear" optimistic flows. All UI
 * text flows through `t()` with translations supplied by the companion
 * `@molecule/app-locales-vote-cluster` package.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { VoteCluster, type VoteValue } from '@molecule/app-vote-cluster-react'
 *
 * function PostRow({ post }: { post: { id: string; score: number; myVote?: VoteValue } }) {
 *   const [score, setScore] = useState(post.score)
 *   const [myVote, setMyVote] = useState<VoteValue>(post.myVote ?? 0)
 *   return (
 *     <VoteCluster
 *       score={score}
 *       myVote={myVote}
 *       onVote={(next) => {
 *         setScore(score - myVote + next)
 *         setMyVote(next)
 *         void fetch(`/api/posts/${post.id}/vote`, {
 *           method: 'POST',
 *           headers: { 'Content-Type': 'application/json' },
 *           body: JSON.stringify({ vote: next }),
 *         })
 *       }}
 *     />
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './types.js'
export * from './VoteCluster.js'
