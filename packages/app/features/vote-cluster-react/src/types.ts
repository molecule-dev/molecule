/**
 * Public types for `<VoteCluster>`.
 *
 * @module
 */

/**
 * Allowed vote values:
 * - `1`  — upvoted
 * - `-1` — downvoted
 * - `0`  — no vote (cleared)
 */
export type VoteValue = 1 | -1 | 0

/** Layout direction for the vote cluster. */
export type VoteClusterDirection = 'vertical' | 'horizontal'

/** Props for {@link VoteCluster}. */
export interface VoteClusterProps {
  /** Current score (number to display between the arrows). */
  score: number
  /**
   * The viewer's current vote.
   *
   * Pass this prop along with `onVote` to use the cluster in **controlled**
   * mode (parent owns state). Omit to use **uncontrolled** mode (the cluster
   * tracks the active vote internally).
   */
  myVote?: VoteValue
  /**
   * Initial vote value used in uncontrolled mode.
   *
   * Ignored when `myVote` is provided.
   */
  defaultVote?: VoteValue
  /**
   * Called whenever the viewer's vote toggles.
   *
   * Toggle semantics:
   * - Clicking up while `myVote === 1` → emits `0` (clears).
   * - Clicking up while `myVote === -1 | 0` → emits `1`.
   * - Clicking down while `myVote === -1` → emits `0` (clears).
   * - Clicking down while `myVote === 1 | 0` → emits `-1`.
   *
   * Parents are expected to update the score accordingly (the component
   * itself does not mutate the `score` prop).
   */
  onVote: (next: VoteValue) => void
  /** Disables both arrow buttons. */
  disabled?: boolean
  /** Layout direction. Defaults to `'vertical'` (Reddit-style stacking). */
  direction?: VoteClusterDirection
  /** Optional accessible label for the whole cluster. */
  ariaLabel?: string
  /** Optional `data-mol-id` for AI-agent automation. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string
}
