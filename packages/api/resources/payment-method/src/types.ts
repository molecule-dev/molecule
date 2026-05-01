/**
 * Payment-method resource types.
 *
 * @module
 */

/**
 * Supported saved-payment-method providers.
 *
 * Open string type so additional rails can be added without editing this
 * package. Well-known values include `stripe`.
 */
export type PaymentMethodProvider = string

/**
 * A saved payment method as returned to API consumers.
 */
export interface PaymentMethod {
  /** Unique identifier for the saved payment method (UUID). */
  id: string
  /** Owner of this payment method. */
  userId: string
  /** Provider that issued the payment method (`stripe`, etc.). */
  provider: PaymentMethodProvider
  /** Provider customer ID (e.g. Stripe `cus_...`). */
  providerCustomerId: string
  /** Provider payment-method ID (e.g. Stripe `pm_...`). */
  providerPaymentMethodId: string
  /** Last four digits of the card. */
  last4: string
  /** Card brand (e.g. `visa`, `mastercard`). */
  brand: string
  /** Two-digit expiry month (1–12). */
  expMonth: number
  /** Four-digit expiry year. */
  expYear: number
  /** Whether this is the user's default saved payment method. */
  isDefault: boolean
  /** ISO 8601 creation timestamp. */
  createdAt: string
}

/**
 * Internal database row for a saved payment method.
 */
export interface PaymentMethodRow {
  id: string
  userId: string
  provider: string
  providerCustomerId: string
  providerPaymentMethodId: string
  last4: string
  brand: string
  expMonth: number
  expYear: number
  isDefault: boolean
  createdAt: string
}

/**
 * Result returned to the client after creating a SetupIntent.
 */
export interface SetupIntentResponse {
  /** Provider SetupIntent ID. */
  id: string
  /** Client secret consumed by the frontend SDK to confirm the SetupIntent. */
  clientSecret: string
  /** Provider customer ID this SetupIntent is attached to. */
  customerId: string
  /** Provider that issued the SetupIntent. */
  provider: PaymentMethodProvider
}

/**
 * Input body for `POST /me/payment-methods` after the SetupIntent confirms.
 */
export interface AttachPaymentMethodInput {
  /** Provider payment-method ID returned by the frontend SDK after confirmation. */
  providerPaymentMethodId: string
  /** Optional flag — when `true`, mark this method as default after attaching. */
  setDefault?: boolean
}
