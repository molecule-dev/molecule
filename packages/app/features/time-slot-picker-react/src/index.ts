/**
 * Time-slot picker for delivery / appointment / reservation flows.
 *
 * Exports `<TimeSlotPicker>` and `TimeSlot` type.
 *
 * @example
 * ```tsx
 * import { TimeSlotPicker } from '@molecule/app-time-slot-picker-react'
 *
 * const slots = [
 *   { id: 'am', label: '9:00–12:00', meta: '3 spots left' },
 *   { id: 'pm', label: '14:00–17:00', meta: 'Available' },
 *   { id: 'eve', label: '18:00–20:00', disabled: true, meta: 'Full' },
 * ]
 *
 * <TimeSlotPicker
 *   slots={slots}
 *   selectedId={selectedSlot}
 *   onSelect={(slot) => setSelectedSlot(slot.id)}
 *   layout="grid"
 *   title="Pick a delivery window"
 * />
 * ```
 *
 * @module
 */

export * from './TimeSlotPicker.js'
