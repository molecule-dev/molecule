/**
 * Svelte formatted address display — the Svelte counterpart of
 * `@molecule/app-address-display-react`, with the same props and the same
 * DOM for the same input.
 *
 * Exports `AddressDisplay` — formatted multi-line (or inline) address with
 * name, phone, leading icon, and action slots. Also exports the `Address`
 * type.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { AddressDisplay } from '@molecule/app-address-display-svelte'
 * </script>
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
 * @remarks
 * - Requires a bonded ClassMap — rendering throws otherwise. No i18n or
 *   router dependency.
 * - The name, leading and actions are node-valued props: pass a snippet or
 *   plain text.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
