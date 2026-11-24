/**
 * Types of `@molecule/app-settings-panel-angular` — the Angular counterpart of
 * `@molecule/app-settings-panel-react`, same props and DOM.
 *
 * @module
 */

/**
 * Context published by `<SettingsContainer>` to its children (the same shape
 * React's `SettingsPanelContext` carries).
 *
 * The container owns the dismiss-the-panel handler; sub-components that need
 * to close after an action (logout, delete account) read it from the context
 * rather than threading the prop down.
 */
export interface SettingsPanelContextValue {
  /** Closes the settings panel (the container's `onClose` prop). */
  onClose: () => void
}

/**
 * A user's registered device (subset rendered in the settings list) — the
 * same shape React's `DevicesSection` renders.
 */
export interface Device {
  /** The device row's id. */
  id: string
  /** Display name (blank rows fall back to the platform). */
  name: string
  /** Platform label. */
  platform: string
  /** Human-readable last-seen text, when the API supplies one. */
  lastSeen?: string
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

/** Props for `AuthSection`. Same name and meaning as the React component's. */
export interface AuthSectionProps {
  /**
   * Show the two-factor row. Set false when the API has no two-factor provider
   * (no `POST /users/:id/verify-two-factor` route). Default true. Bound in a template as
   * `[twoFactor]="false"`.
   */
  twoFactor?: boolean
}

/**
 * Props for `TiersUpgradeSection` — the same props
 * `@molecule/app-settings-panel-react` accepts.
 */
export interface TiersUpgradeSectionProps {
  /**
   * How the page leaves for the checkout URL the server returns. Defaults to a
   * full-page navigation (`openUrl` from `@molecule/app-utilities`).
   */
  redirectToCheckout?: (checkoutUrl: string) => void
}
