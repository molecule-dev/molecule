/**
 * Time-slot picker for delivery / appointment / reservation flows — the Solid
 * counterpart of `@molecule/app-time-slot-picker-react`.
 *
 * Exports `TimeSlotPicker` and the `TimeSlot` type, with the same props
 * (React names) and the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 *
 * import { TimeSlotPicker } from '@molecule/app-time-slot-picker-solid'
 *
 * export function DeliveryStep() {
 *   const [selected, setSelected] = createSignal<string>()
 *   const slots = [
 *     { id: 'am', label: '9:00–12:00', meta: '3 spots left' },
 *     { id: 'pm', label: '14:00–17:00', meta: 'Available' },
 *     { id: 'eve', label: '18:00–20:00', disabled: true, meta: 'Full' },
 *   ]
 *   return (
 *     <TimeSlotPicker
 *       slots={slots}
 *       selectedId={selected()}
 *       onSelect={(slot) => setSelected(slot.id)}
 *       layout="grid"
 *       columns={3}
 *       title="Pick a delivery window"
 *     />
 *   )
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
 *
 * @module
 */

export * from './TimeSlotPicker.jsx'
export * from './types.js'
