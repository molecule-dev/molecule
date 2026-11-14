/**
 * Types for `@molecule/app-settings-panel-svelte`.
 *
 * The Svelte counterpart of `@molecule/app-settings-panel-react`: the same
 * prop names and value shapes as the React components, with `children` and
 * node-valued props typed as Svelte snippets.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * A user's registered device (subset rendered in the settings list).
 *
 * Same shape as `@molecule/app-settings-panel-react`'s `Device`.
 */
export interface Device {
  /** The device row's id. */
  id: string
  /** The device's display name. */
  name: string
  /** The device's platform (`ios`, `android`, `linux`, …). */
  platform: string
  /** When the device was last seen, as the API reports it. */
  lastSeen?: string
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

/** Props for the `SettingsContainer` component. */
export interface SettingsContainerProps {
  /** Dismiss-the-panel handler, published to every section through context. */
  onClose: () => void
  /** The section sub-components to host. */
  children?: Snippet
}

/** Props for the `DevicesSection` component. */
export interface DevicesSectionProps {
  /**
   * Custom trailing element per device row, replacing the built-in revoke
   * control. Render nothing to suppress the control entirely.
   */
  renderRowIcon?: Snippet<[Device]>
}

/** Props for the `TiersUpgradeSection` component. */
export interface TiersUpgradeSectionProps {
  /**
   * How the page leaves for the checkout URL the server returns. Defaults to a
   * full-page navigation (`openUrl` from `@molecule/app-utilities`).
   */
  redirectToCheckout?: (checkoutUrl: string) => void
}

/**
 * The profile values `AccountSection` edits (its controlled form fields).
 * Same shape the React component keeps.
 */
export interface AccountValues {
  /** The user's display name. */
  name: string
  /** The user's email address (blank for phone/handle accounts). */
  email: string
}

/**
 * The two-factor enrollment payload `POST /users/:id/verify-two-factor`
 * answers with (`action: 'setup'`).
 */
export interface TwoFactorSetup {
  /** The QR code image URL to scan into an authenticator app. */
  QRImageUrl?: string
  /** The `otpauth://` key URL behind the QR code. */
  keyUrl?: string
  /** The base32 secret, shown for manual entry. */
  secret?: string
}

/** One price of a billing tier, mapped from `/api/billing/tiers`. */
export interface TierPrice {
  /** The Stripe price id, when the price is purchasable. */
  stripePriceId?: string
  /** The billing interval (`month`, `year`). */
  interval: string
  /** The formatted price label (`$9`). */
  priceLabel: string
}

/** One paid tier, mapped from `/api/billing/tiers`. */
export interface Tier {
  /** The tier's plan key (`free`, `pro`, …). */
  planKey: string
  /** The tier's display name. */
  name: string
  /** The tier's prices. */
  prices: TierPrice[]
}
