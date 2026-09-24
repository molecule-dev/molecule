/**
 * Address display.
 *
 * Exports `<AddressDisplay>` — formatted multi-line (or inline) address with
 * name, phone, leading icon, and action slots.
 * Also exports the `Address` type.
 *
 * @example
 * ```tsx
 * import type { Address } from '@molecule/app-address-display-react'
 * import { AddressDisplay } from '@molecule/app-address-display-react'
 * import { t } from '@molecule/app-i18n'
 * import { Button } from '@molecule/app-ui-react'
 *
 * export function ShippingAddress() {
 *   const address: Address = {
 *     line1: '123 Main St',
 *     line2: 'Apt 4B',
 *     city: 'Springfield',
 *     state: 'IL',
 *     postalCode: '62701',
 *     country: 'US',
 *   }
 *   return (
 *     <AddressDisplay
 *       name="Jane Smith"
 *       address={address}
 *       phone="+1 555-867-5309"
 *       actions={
 *         <Button variant="ghost" size="sm" data-mol-id="shipping-address-edit">
 *           {t('common.edit', undefined, { defaultValue: 'Edit' })}
 *         </Button>
 *       }
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Needs a ClassMap bond.** It styles itself via `getClassMap()`, which throws unless the app
 *   called `setClassMap(classMap)` (from `@molecule/app-ui`, e.g. with `@molecule/app-ui-tailwind`)
 *   at startup.
 * - Display only — no geocoding, validation, or locale-specific address ordering. Lines are always
 *   `line1`, `line2`, `"city, state postalCode"`, `country`; empty fields are skipped, and
 *   `country` renders exactly as given (no code-to-name lookup).
 * - `phone` becomes a `tel:` link verbatim — pass a dialable string. `inline` joins every line
 *   with `", "` into one `<span>` (for table cells) instead of an `<address>` block.
 *
 * @module
 */

export * from './AddressDisplay.js'
