/**
 * Shared types of `@molecule/app-settings-panel-solid`.
 *
 * @module
 */

/**
 * Context published by `<SettingsContainer>` to its children.
 *
 * The container owns the dismiss-the-panel handler; sub-components
 * that need to close after an action (logout, delete account, email
 * error) read it from context rather than threading the prop down.
 */
export interface SettingsPanelContextValue {
  /** Dismisses the settings panel (the container's `onClose` prop). */
  onClose: () => void
}

/** A user's registered device (subset rendered in the settings list). */
export interface Device {
  /** The device's id on the wire (`DELETE /api/devices/:id`). */
  id: string
  /** The device's display name; may be empty (the platform is shown then). */
  name: string
  /** The device's platform (`ios`, `linux`, …). */
  platform: string
  /** When the device was last seen, as the API renders it. */
  lastSeen?: string
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

/** Props for {@link TiersUpgradeSection}. */
export interface TiersUpgradeSectionProps {
  /**
   * How the page leaves for the checkout URL the server returns. Defaults to a
   * full-page navigation (`openUrl` from `@molecule/app-utilities`).
   */
  redirectToCheckout?: (checkoutUrl: string) => void
}
