/**
 * Time-slot picker for delivery / appointment / reservation flows — the Vue
 * counterpart of `@molecule/app-time-slot-picker-react`.
 *
 * Exports `<TimeSlotPicker>` and the `TimeSlot` type, with the same props
 * (React names) and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 *
 * import { TimeSlotPicker } from '@molecule/app-time-slot-picker-vue'
 *
 * const DeliveryStep = defineComponent({
 *   setup() {
 *     const selected = ref<string>()
 *     const slots = [
 *       { id: 'am', label: '9:00–12:00', meta: '3 spots left' },
 *       { id: 'pm', label: '14:00–17:00', meta: 'Available' },
 *       { id: 'eve', label: '18:00–20:00', disabled: true, meta: 'Full' },
 *     ]
 *     return () =>
 *       h(TimeSlotPicker, {
 *         slots,
 *         selectedId: selected.value,
 *         onSelect: (slot) => {
 *           selected.value = slot.id
 *         },
 *         layout: 'grid',
 *         columns: 3,
 *         title: 'Pick a delivery window',
 *       })
 *   },
 * })
 *
 * createApp(DeliveryStep).mount('#app')
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
 * - Node-valued props (`title`, and an item's `label`/`meta`) arrive as a
 *   prop or as the same-named slot for `title`.
 *
 * @module
 */

export * from './TimeSlotPicker.js'
export * from './types.js'
