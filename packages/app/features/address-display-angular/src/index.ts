/**
 * Angular formatted address display — the counterpart of
 * `@molecule/app-address-display-react`: the same props and the same DOM for
 * the same input.
 *
 * Exports `<AddressDisplay>` — formatted multi-line (or inline) address with
 * name, phone, leading icon, and action slots. Also exports the `Address`
 * type.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { AddressDisplay } from '@molecule/app-address-display-angular'
 *
 * @Component({
 *   selector: 'contact-card',
 *   standalone: true,
 *   imports: [AddressDisplay],
 *   template: `
 *     <div
 *       mol-address-display
 *       [address]="{
 *         line1: '123 Main St',
 *         city: 'Springfield',
 *         state: 'IL',
 *         postalCode: '62701',
 *         country: 'US'
 *       }"
 *       name="Jane Smith"
 *       phone="+1 555-867-5309"
 *     >
 *       <mol-edit-actions slot="actions" />
 *     </div>
 *   `,
 * })
 * export class ContactCard {}
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap — rendering throws otherwise. No i18n or
 *   router dependency.
 * - Node props are projected content: `name`, `leading` and `actions` are
 *   selected by `[slot=name]` / `[slot=leading]` / `[slot=actions]`; a string
 *   `name` input renders as text instead.
 *
 * @module
 */

export * from './address-display.component.js'
export * from './types.js'
