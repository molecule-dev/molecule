/**
 * Types of `@molecule/app-time-slot-picker-svelte` — the Svelte counterpart of
 * `@molecule/app-time-slot-picker-react`, the same props (React names) and the
 * same DOM for the same input.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Represents a single selectable time slot with an optional meta line and disabled state. */
export interface TimeSlot {
  /** Stable identity, used as the list key and compared with `selectedId`. */
  id: string
  /** Display label — `'14:00–16:00'`, `'Morning (9–12)'`, etc.: text or a snippet. */
  label: string | Snippet
  /** Optional secondary line — date, fee, capacity: text or a snippet. */
  meta?: string | Snippet
  /** When true, slot is disabled (full / past / unavailable). */
  disabled?: boolean
}

/** Props accepted by the {@link TimeSlotPicker} component. */
export interface TimeSlotPickerProps {
  /** The selectable slots, rendered in order. */
  slots: TimeSlot[]
  /** Currently selected slot id. */
  selectedId?: string
  /** Called when an enabled slot is picked. */
  onSelect: (slot: TimeSlot) => void
  /** Layout — `'list'` stacks vertically (mobile), `'grid'` lays out in columns. */
  layout?: 'list' | 'grid'
  /** Grid column count (only for `layout='grid'`). Defaults to `2`. */
  columns?: 2 | 3 | 4
  /** Optional title above the slots: text, or a snippet. */
  title?: string | Snippet
  /** Extra classes. */
  className?: string
}
