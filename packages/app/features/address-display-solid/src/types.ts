/**
 * Types for the Solid formatted address display.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Structured postal address with optional individual fields. */
export interface Address {
  /** First line — street + number. */
  line1?: string
  /** Second line — apartment, suite, unit. */
  line2?: string
  /** City. */
  city?: string
  /** State / province / region. */
  state?: string
  /** ZIP / postal code. */
  postalCode?: string
  /** Country. */
  country?: string
}

/** Props for {@link AddressDisplay}. */
export interface AddressDisplayProps {
  /** Address fields. */
  address: Address
  /** Optional name / label preceding the address. */
  name?: JSX.Element
  /** Optional phone number rendered under the address. */
  phone?: string
  /** Optional `<Icon>` / avatar leading slot. */
  leading?: JSX.Element
  /** Optional right-side actions. */
  actions?: JSX.Element
  /** Format as a single line instead of multi-line. */
  inline?: boolean
  /** Extra classes. */
  className?: string
}
