/**
 * Solid formatted address display.
 *
 * Exports `AddressDisplay` — formatted multi-line (or inline) address with
 * name, phone, leading icon, and action slots. Also exports the `Address`
 * type. It is the Solid counterpart of `@molecule/app-address-display-react`:
 * the same props (React names) and the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { AddressDisplay } from '@molecule/app-address-display-solid'
 * import { EditButton } from './EditButton'
 *
 * export function Contact() {
 *   return (
 *     <AddressDisplay
 *       name="Jane Smith"
 *       address={{
 *         line1: '123 Main St',
 *         city: 'Springfield',
 *         state: 'IL',
 *         postalCode: '62701',
 *         country: 'US',
 *       }}
 *       phone="+1 555-867-5309"
 *       actions={<EditButton />}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap — rendering throws otherwise. No i18n or
 *   router dependency.
 *
 * @module
 */

export * from './AddressDisplay.jsx'
export * from './types.js'
