/**
 * Types for the Vue formatted address display.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

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
  /** Optional name / label preceding the address. Passed as a prop or as the same-named slot. */
  name?: VNodeChild
  /** Optional phone number rendered under the address. */
  phone?: string
  /** Optional `<Icon>` / avatar leading slot. Passed as a prop or as the same-named slot. */
  leading?: VNodeChild
  /** Optional right-side actions. Passed as a prop or as the same-named slot. */
  actions?: VNodeChild
  /** Format as a single line instead of multi-line. */
  inline?: boolean
  /** Extra classes. */
  className?: string
}
