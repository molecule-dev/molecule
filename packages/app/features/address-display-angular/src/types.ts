/**
 * Types of `@molecule/app-address-display-angular` — the Angular counterpart
 * of `@molecule/app-address-display-react`, same props and DOM.
 *
 * @module
 */

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

/**
 * Props accepted by {@link AddressDisplay} — the same props
 * `@molecule/app-address-display-react` accepts. Node props (`name`,
 * `leading`, `actions`) are projected content in Angular (an input cannot
 * carry a node), so they are typed `unknown`: pass them in the host template,
 * not as values.
 */
export interface AddressDisplayProps {
  /** Address fields. */
  address: Address
  /** Optional name / label preceding the address, projected as `[slot=name]` content. */
  name?: unknown
  /** Optional phone number rendered under the address. */
  phone?: string
  /** Optional `<Icon>` / avatar leading slot, projected as `[slot=leading]` content. */
  leading?: unknown
  /** Optional right-side actions, projected as `[slot=actions]` content. */
  actions?: unknown
  /** Format as a single line instead of multi-line. */
  inline?: boolean
  /** Extra classes. */
  className?: string
}
