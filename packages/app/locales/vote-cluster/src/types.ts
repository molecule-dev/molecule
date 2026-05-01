/**
 * Translation keys for the vote cluster locale package.
 *
 * Keys are referenced from `@molecule/app-vote-cluster-react` via
 * `t('vote-cluster.<key>', …, { defaultValue })`.
 */
export type VoteClusterTranslationKey =
  | 'vote-cluster.upvote'
  | 'vote-cluster.removeUpvote'
  | 'vote-cluster.downvote'
  | 'vote-cluster.removeDownvote'
  | 'vote-cluster.score'
  | 'vote-cluster.group'

/** Translation record mapping vote-cluster keys to translated strings. */
export type VoteClusterTranslations = Record<VoteClusterTranslationKey, string>
