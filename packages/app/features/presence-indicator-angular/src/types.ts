/**
 * Types of `@molecule/app-presence-indicator-angular` — the Angular
 * counterpart of `@molecule/app-presence-indicator-react`, same props and DOM.
 *
 * @module
 */

/** Union of supported user-presence states displayed by the dot. */
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

/** Props accepted by {@link PresenceDot} — the same props React's `PresenceDot` accepts. */
export interface PresenceDotProps {
  /** The presence state to display. */
  status: PresenceStatus
  /** Diameter in pixels. Defaults to 10. */
  size?: number
  /** Position — `'inline'` default; `'overlay'` positions absolutely for avatar overlays. */
  position?: 'inline' | 'overlay'
  /** Overlay corner when `position="overlay"`. Defaults to `'bottom-right'`. */
  corner?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  /** Accessible label override. Defaults to `Presence: <status>`. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}

/**
 * Props accepted by {@link AvatarWithPresence} — the same props React's
 * `AvatarWithPresence` accepts. The decorated avatar (`children`) is
 * projected content in Angular (an input cannot carry a node), so it is typed
 * `unknown`: pass it in the host template, not as a value.
 */
export interface AvatarWithPresenceProps {
  /** The avatar / media to decorate, projected as the element's default content. */
  children?: unknown
  /** Presence status; omit to hide the dot. */
  status?: PresenceStatus
  /** Corner placement of the dot. Defaults to `'bottom-right'`. */
  corner?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  /** Dot size. Defaults to 10. */
  dotSize?: number
  /** Extra classes on the outer wrapper. */
  className?: string
}
