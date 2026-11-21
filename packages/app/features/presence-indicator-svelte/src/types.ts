/**
 * Types for the Svelte presence indicator.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Union of supported user-presence states displayed by the dot. */
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

/** Props accepted by the {@link PresenceDot} component. */
export interface PresenceDotProps {
  /** The presence state to display. */
  status: PresenceStatus
  /** Diameter in pixels. Defaults to 10. */
  size?: number
  /** Position — `'inline'` default; `'overlay'` positions absolutely for avatar overlays. */
  position?: 'inline' | 'overlay'
  /** Overlay corner when `position="overlay"`. Defaults to `'bottom-right'`. */
  corner?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  /** Accessible label override; defaults to `t('presenceIndicator.aria.presence', …)`. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}

/** Props accepted by the {@link AvatarWithPresence} component. */
export interface AvatarWithPresenceProps {
  /**
   * The avatar / media to decorate. Omitted renders no child; React declares
   * it required, but an absent child renders nothing either way.
   */
  children?: Snippet
  /** Presence status; omit to hide the dot. */
  status?: PresenceStatus
  /** Corner placement of the dot. Defaults to `'bottom-right'`. */
  corner?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  /** Dot size. Defaults to 10. */
  dotSize?: number
  /** Extra classes on the outer wrapper. */
  className?: string
}
