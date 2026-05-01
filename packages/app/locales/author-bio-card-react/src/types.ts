/**
 * Translation keys for the author-bio-card-react locale package.
 *
 * Used by `<AuthorBioCard>` for the follow-button labels, social-link
 * labels, and the per-platform aria descriptions.
 */
export type AuthorBioCardTranslationKey =
  | 'authorBioCard.follow'
  | 'authorBioCard.following'
  | 'authorBioCard.social.twitter.label'
  | 'authorBioCard.social.github.label'
  | 'authorBioCard.social.linkedin.label'
  | 'authorBioCard.social.mastodon.label'
  | 'authorBioCard.social.website.label'
  | 'authorBioCard.social.twitter'
  | 'authorBioCard.social.github'
  | 'authorBioCard.social.linkedin'
  | 'authorBioCard.social.mastodon'
  | 'authorBioCard.social.website'

/** Translation record mapping author-bio-card keys to translated strings. */
export type AuthorBioCardTranslations = Record<AuthorBioCardTranslationKey, string>
