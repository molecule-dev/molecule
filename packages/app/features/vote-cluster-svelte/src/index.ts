/**
 * Svelte Reddit/HN-style vote cluster — stacked up/down arrows + score readout.
 *
 * Exports `VoteCluster` — the Svelte counterpart of
 * `@molecule/app-vote-cluster-react`: the same props (React names) and the same
 * DOM for the same input. Toggle semantics handle upvote, downvote, and "click
 * again to clear" optimistic flows. All UI text flows through `t()` with
 * translations supplied by the companion `@molecule/app-locales-vote-cluster`
 * package.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { VoteCluster, type VoteValue } from '@molecule/app-vote-cluster-svelte'
 *
 *   let { post } = $props<{ post: { id: string; score: number; myVote?: VoteValue } }>()
 *   let score = $state(post.score)
 *   let myVote = $state<VoteValue>(post.myVote ?? 0)
 * </script>
 *
 * <VoteCluster
 *   {score}
 *   {myVote}
 *   onVote={(next) => {
 *     score = score - myVote + next
 *     myVote = next
 *     void fetch(`/api/posts/${post.id}/vote`, {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ vote: next }),
 *     })
 *   }}
 * />
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

export * from './components.js'
export * from './types.js'
