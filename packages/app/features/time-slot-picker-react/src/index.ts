/**
 * Time-slot picker for delivery / appointment / reservation flows.
 *
 * Exports `<TimeSlotPicker>` and the `TimeSlot` type.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { type TimeSlot, TimeSlotPicker } from '@molecule/app-time-slot-picker-react'
 *
 * export function DeliveryWindowStep() {
 *   const windows = [
 *     { start: '2026-10-02T13:00:00Z', end: '2026-10-02T16:00:00Z', remaining: 3 },
 *     { start: '2026-10-02T18:00:00Z', end: '2026-10-02T21:00:00Z', remaining: 8 },
 *     { start: '2026-10-02T22:00:00Z', end: '2026-10-03T00:00:00Z', remaining: 0 },
 *   ]
 *   const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
 *   const slots: TimeSlot[] = windows.map((w) => ({
 *     id: w.start,
 *     label: `${time.format(new Date(w.start))} – ${time.format(new Date(w.end))}`,
 *     meta: w.remaining > 0 ? `${w.remaining} spots left` : 'Full',
 *     disabled: w.remaining === 0,
 *   }))
 *   const [selectedId, setSelectedId] = useState<string>()
 *   return (
 *     <TimeSlotPicker
 *       title="Pick a delivery window"
 *       slots={slots}
 *       selectedId={selectedId}
 *       onSelect={(slot) => setSelectedId(slot.id)}
 *       layout="grid"
 *       columns={3}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - It is CONTROLLED: pass `selectedId` and update it from
 *   `onSelect(slot)` (which receives the whole `TimeSlot`, not the id) or
 *   nothing ever looks selected. It does NOT fetch availability or book
 *   anything.
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
