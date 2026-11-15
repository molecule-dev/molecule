/**
 * Vue formatted address display.
 *
 * Exports `<AddressDisplay>` — formatted multi-line (or inline) address with
 * name, phone, leading icon, and action slots. Also exports the `Address`
 * type. It is the Vue counterpart of `@molecule/app-address-display-react`:
 * the same props (React names) and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { AddressDisplay } from '@molecule/app-address-display-vue'
 *
 * createApp(
 *   defineComponent({
 *     setup() {
 *       return () =>
 *         h(AddressDisplay, {
 *           name: 'Jane Smith',
 *           address: {
 *             line1: '123 Main St',
 *             city: 'Springfield',
 *             state: 'IL',
 *             postalCode: '62701',
 *             country: 'US',
 *           },
 *           phone: '+1 555-867-5309',
 *         })
 *     },
 *   }),
 * ).mount('#app')
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap — rendering throws otherwise. No i18n or
 *   router dependency.
 * - The name, leading and actions are node-valued props: pass a value or the
 *   same-named slot, and the slot wins when both are given.
 *
 * @module
 */

export * from './AddressDisplay.js'
export * from './types.js'
