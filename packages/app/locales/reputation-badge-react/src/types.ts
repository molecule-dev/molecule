/**
 * Translation keys for the reputation-badge-react locale package.
 *
 * Used by both `<ReputationBadge>` (level chip + score caption +
 * accessibility label) and `<BadgeShelf>` (aria summary + overflow chip).
 */
export type ReputationBadgeTranslationKey =
  | 'reputationBadge.caption'
  | 'reputationBadge.aria'
  | 'reputationBadge.level.newcomer'
  | 'reputationBadge.level.contributor'
  | 'reputationBadge.level.trusted'
  | 'reputationBadge.level.veteran'
  | 'reputationBadge.level.legend'
  | 'badgeShelf.aria'
  | 'badgeShelf.overflow.aria'

/** Translation record mapping reputation-badge keys to translated strings. */
export type ReputationBadgeTranslations = Record<ReputationBadgeTranslationKey, string>
