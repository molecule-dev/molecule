/**
 * Types of `@molecule/app-social-share-buttons-angular` — the Angular
 * counterpart of `@molecule/app-social-share-buttons-react`, same props and
 * DOM.
 *
 * @module
 */

/**
 * Supported social/sharing platforms for the share-buttons widget.
 */
export type SocialPlatform = 'twitter' | 'x' | 'linkedin' | 'facebook' | 'reddit' | 'email' | 'copy'

/** Props for {@link SocialShareButtons} — the same props the React package takes. */
export interface SocialShareButtonsProps {
  /** URL to share. */
  url: string
  /** Optional share text / title. */
  title?: string
  /** Platforms to include (order = display order). */
  platforms?: SocialPlatform[]
  /** Visual size. */
  size?: 'sm' | 'md'
  /** Extra classes. */
  className?: string
}
