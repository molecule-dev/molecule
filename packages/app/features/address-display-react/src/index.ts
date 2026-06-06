/**
 * Address display.
 *
 * Exports `<AddressDisplay>` — formatted multi-line (or inline) address with
 * name, phone, leading icon, and action slots.
 * Also exports the `Address` type.
 *
 * @example
 * ```tsx
 * import { AddressDisplay } from '@molecule/app-address-display-react'
 *
 * <AddressDisplay
 *   name="Jane Smith"
 *   address={{
 *     line1: '123 Main St',
 *     city: 'Springfield',
 *     state: 'IL',
 *     postalCode: '62701',
 *     country: 'US',
 *   }}
 *   phone="+1 555-867-5309"
 * />
 * ```
 *
 * @module
 */

export * from './AddressDisplay.js'
