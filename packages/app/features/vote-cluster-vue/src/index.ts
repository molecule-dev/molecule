/**
 * Vue Reddit/HN-style vote cluster — stacked up/down arrows + score readout.
 *
 * Exports `<VoteCluster>` — the Vue counterpart of
 * `@molecule/app-vote-cluster-react`: the same props (React names) and the
 * same DOM for the same input. Toggle semantics handle upvote, downvote, and
 * "click again to clear" optimistic flows. All UI text flows through `t()` with
 * translations supplied by the companion `@molecule/app-locales-vote-cluster`
 * package.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 *
 * import { VoteCluster, type VoteValue } from '@molecule/app-vote-cluster-vue'
 *
 * const PostRow = defineComponent({
 *   props: { post: { type: Object, required: true } },
 *   setup(props) {
 *     const score = ref(props.post.score)
 *     const myVote = ref<VoteValue>(props.post.myVote ?? 0)
 *     return () =>
 *       h(VoteCluster, {
 *         score: score.value,
 *         myVote: myVote.value,
 *         onVote: (next: VoteValue) => {
 *           score.value = score.value - myVote.value + next
 *           myVote.value = next
 *           void fetch(`/api/posts/${props.post.id}/vote`, {
 *             method: 'POST',
 *             headers: { 'Content-Type': 'application/json' },
 *             body: JSON.stringify({ vote: next }),
 *           })
 *         },
 *       })
 *   },
 * })
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
export * from './VoteCluster.js'
