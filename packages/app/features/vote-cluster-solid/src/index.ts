/**
 * Solid Reddit/HN-style vote cluster — stacked up/down arrows + score readout.
 *
 * Exports `<VoteCluster>` — the Solid counterpart of
 * `@molecule/app-vote-cluster-react`: the same props (React names) and the same
 * DOM for the same input. Toggle semantics handle upvote, downvote, and "click
 * again to clear" optimistic flows. All UI text flows through `t()` with
 * translations supplied by the companion `@molecule/app-locales-vote-cluster`
 * package.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 *
 * import { VoteCluster, type VoteValue } from '@molecule/app-vote-cluster-solid'
 *
 * export function PostRow(props: { post: { id: string; score: number; myVote?: VoteValue } }) {
 *   const [score, setScore] = createSignal(props.post.score)
 *   const [myVote, setMyVote] = createSignal<VoteValue>(props.post.myVote ?? 0)
 *   return (
 *     <VoteCluster
 *       score={score()}
 *       myVote={myVote()}
 *       onVote={(next) => {
 *         setScore(score() - myVote() + next)
 *         setMyVote(next)
 *         void fetch(`/api/posts/${props.post.id}/vote`, {
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
 * @remarks
 * - Requires a bonded ClassMap; the active arrow is painted through
 *   `--mol-color-*` custom properties.
 * - Uncontrolled by default (tracks the vote internally); pass `myVote` +
 *   `onVote` for controlled mode.
 *
 * @module
 */

export * from './types.js'
export * from './VoteCluster.jsx'
