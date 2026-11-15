/**
 * Types for the Svelte formatted address display.
 *
 * @module
 */

import type { Snippet } from 'svelte'

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

/** A node-valued prop: a snippet (the caller's slot), or plain text. */
type NodeProp = Snippet | string

/** Props for {@link AddressDisplay}. */
export interface AddressDisplayProps {
  /** Address fields. */
  address: Address
  /** Optional name / label preceding the address. */
  name?: NodeProp
  /** Optional phone number rendered under the address. */
  phone?: string
  /** Optional `<Icon>` / avatar leading slot. */
  leading?: NodeProp
  /** Optional right-side actions. */
  actions?: NodeProp
  /** Format as a single line instead of multi-line. */
  inline?: boolean
  /** Extra classes. */
  className?: string
}
