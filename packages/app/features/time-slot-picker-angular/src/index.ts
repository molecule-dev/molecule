/**
 * Angular time-slot picker — the counterpart of
 * `@molecule/app-time-slot-picker-react`: the same props and the same DOM for
 * the same input.
 *
 * Exports `<TimeSlotPicker>` and the `TimeSlot` type. It is a radiogroup of
 * selectable delivery / appointment slots, each with a label and an optional
 * meta line, in a list or a fixed-column grid, styled via the ClassMap bond.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import {
 *   TimeSlotPicker,
 *   type TimeSlot,
 * } from '@molecule/app-time-slot-picker-angular'
 *
 * @Component({
 *   selector: 'app-delivery-step',
 *   standalone: true,
 *   imports: [TimeSlotPicker],
 *   template: `
 *     <div
 *       mol-time-slot-picker
 *       [slots]="slots()"
 *       [selectedId]="selected()"
 *       [onSelect]="pick"
 *       layout="grid"
 *       [columns]="3"
 *       title="Pick a delivery window"
 *     ></div>
 *   `,
 * })
 * export class DeliveryStep {
 *   readonly slots = signal<TimeSlot[]>([
 *     { id: 'am', label: '9:00–12:00', meta: '3 spots left' },
 *     { id: 'pm', label: '14:00–17:00', meta: 'Available' },
 *     { id: 'eve', label: '18:00–20:00', disabled: true, meta: 'Full' },
 *   ])
 *   readonly selected = signal<string | undefined>(undefined)
 *
 *   readonly pick = (slot: TimeSlot): void => this.selected.set(slot.id)
 * }
 * ```
 *
 * @remarks
 * - Must render inside the app's i18n provider and with a ClassMap bond
 *   wired (`useTranslation()` / `getClassMap()` throw otherwise).
 * - The picker has NO date/timezone logic — `label`/`meta` are opaque
 *   nodes. Format times in the user's locale AND timezone yourself before
 *   passing them.
 * - `layout="grid"` uses a FIXED column count (no breakpoint collapse) —
 *   choose `columns` for your narrowest supported viewport or switch to
 *   `layout="list"` on mobile.
 * - Selection is conveyed by `aria-checked` + bolder font only — add a
 *   selected surface via `className` logic in your wrapper if the state
 *   reads too subtle.
 * - Disabled slots are dimmed and non-clickable (`onSelect` never fires
 *   for them).
 * - Node-valued `title` is projected as `[slot=title]` content; node-valued
 *   `label`/`meta` arrive as templates.
 *
 * @module
 */

export * from './time-slot-picker.component.js'
export * from './types.js'
