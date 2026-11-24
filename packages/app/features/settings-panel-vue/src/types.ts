/**
 * Types for the Vue settings panel.
 *
 * @module
 */

/** A user's registered device (subset rendered in the settings list). */
export interface Device {
  /** The device row's id (names the revoke request URL). */
  id: string
  /** The device's display name (a blank name falls back to the platform). */
  name: string
  /** The device's platform label. */
  platform: string
  /** When the device was last seen, as the API renders it. */
  lastSeen?: string
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

/** Props for `AuthSection`. Same name and meaning as the React component's. */
export interface AuthSectionProps {
  /**
   * Show the two-factor row. Set false when the API has no two-factor provider
   * (no `POST /users/:id/verify-two-factor` route). Default true. Bound in a template as
   * `:two-factor="false"`.
   */
  twoFactor?: boolean
}

/** Props for the {@link TiersUpgradeSection} component. */
export interface TiersUpgradeSectionProps {
  /**
   * How the page leaves for the checkout URL the server returns. Defaults to a
   * full-page navigation (`openUrl` from `@molecule/app-utilities`).
   */
  redirectToCheckout?: (checkoutUrl: string) => void
}
