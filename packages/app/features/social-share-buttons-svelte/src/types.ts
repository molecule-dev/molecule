/**
 * Types for the Svelte social share buttons.
 *
 * @module
 */

/**
 * Supported social/sharing platforms for the share-buttons widget.
 */
export type SocialPlatform = 'twitter' | 'x' | 'linkedin' | 'facebook' | 'reddit' | 'email' | 'copy'

/** Props for the {@link SocialShareButtons} component. */
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
