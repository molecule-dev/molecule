/**
 * Time-slot picker for delivery / appointment / reservation flows.
 *
 * Exports `<TimeSlotPicker>` and the `TimeSlot` type.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { TimeSlotPicker } from '@molecule/app-time-slot-picker-react'
 *
 * function DeliveryStep() {
 *   const [selectedSlot, setSelectedSlot] = useState<string | undefined>()
 *   const slots = [
 *     { id: 'am', label: '9:00–12:00', meta: '3 spots left' },
 *     { id: 'pm', label: '14:00–17:00', meta: 'Available' },
 *     { id: 'eve', label: '18:00–20:00', disabled: true, meta: 'Full' },
 *   ]
 *   return (
 *     <TimeSlotPicker
 *       slots={slots}
 *       selectedId={selectedSlot}
 *       onSelect={(slot) => setSelectedSlot(slot.id)}
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
 *   strings. Format times in the user's locale AND timezone yourself
 *   before passing them; the component will happily display UTC labels
 *   to a local-time user.
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

export * from './TimeSlotPicker.js'
