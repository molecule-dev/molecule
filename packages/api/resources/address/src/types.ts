/**
 * Address resource type definitions.
 *
 * Per-user saved shipping/billing addresses with default flag, country-aware
 * fields, and validation.
 *
 * @module
 */

/**
 * A user-owned mailing address (shipping or billing).
 */
export interface Address {
  /** Unique address identifier. */
  id: string
  /** The ID of the user who owns the address. */
  userId: string
  /** Optional human-readable label (e.g. "Home", "Work"). */
  label: string | null
  /** Recipient name printed on the package/invoice. */
  recipientName: string
  /** Street address line 1. */
  line1: string
  /** Street address line 2 (apartment, suite, unit). */
  line2: string | null
  /** City / locality. */
  city: string
  /** Region / state / province. Optional — not all countries have one. */
  region: string | null
  /** Postal / ZIP code. */
  postalCode: string
  /** ISO 3166-1 alpha-2 country code (e.g. "US", "GB"). */
  countryIso: string
  /** Optional contact phone number for delivery. */
  phone: string | null
  /** Whether this is the user's default shipping address. */
  isDefaultShipping: boolean
  /** Whether this is the user's default billing address. */
  isDefaultBilling: boolean
  /** When the address was created (ISO 8601). */
  createdAt: string
  /** When the address was last updated (ISO 8601). */
  updatedAt: string
}

/**
 * Input for creating an address. Server fills in `id`, `createdAt`, `updatedAt`.
 */
export type CreateAddressInput = Omit<Address, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Partial update for an existing address. `id`, `userId`, and timestamps are
 * never updatable here.
 */
export type UpdateAddressInput = Partial<Omit<Address, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>

/**
 * Which kind of default flag to set on an address.
 */
export type DefaultAddressKind = 'shipping' | 'billing'
