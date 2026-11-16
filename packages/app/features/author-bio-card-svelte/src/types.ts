/**
 * Types for the Svelte author bio card.
 *
 * @module
 */

/**
 * Social handles / profile links for an author. All keys are optional —
 * pass only the platforms the author actually has. Each value may be a
 * full URL or a bare handle (`"@alice"`); the card forwards values to
 * `<a href>` verbatim, so callers control the linking strategy.
 */
export interface AuthorSocials {
  /** Twitter / X profile URL or handle. */
  twitter?: string
  /** GitHub profile URL or handle. */
  github?: string
  /** LinkedIn profile URL. */
  linkedin?: string
  /** Mastodon profile URL or `@user@instance` handle. */
  mastodon?: string
  /** Personal website URL. */
  website?: string
}

/**
 * Author identity rendered by `<AuthorBioCard>`.
 */
export interface AuthorBioCardAuthor {
  /** Stable identifier (used as a link key, `data-mol-id` suffix, etc.). */
  id: string
  /** Display name — rendered as a clickable link if `href` is provided. */
  name: string
  /** Optional avatar image URL. Falls back to initials if omitted. */
  avatar?: string
  /** Optional bio paragraph. */
  bio?: string
  /** Optional profile URL — when set, the name renders as a link. */
  href?: string
  /** Optional dictionary of social handles / profile links. */
  socials?: AuthorSocials
}
