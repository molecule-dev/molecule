/**
 * Types of `@molecule/app-time-slot-picker-angular` — the Angular counterpart
 * of `@molecule/app-time-slot-picker-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * Represents a single selectable time slot with an optional meta line and
 * disabled state. Node-valued `label`/`meta` arrive as a template (the
 * conformance kit's data-prop node value), or as plain text.
 */
export interface TimeSlot {
  /** Stable identity, used as the list key and compared with `selectedId`. */
  id: string
  /** Display label — `'14:00–16:00'`, `'Morning (9–12)'`, etc.: text or a template. */
  label: string | TemplateRef<unknown>
  /** Optional secondary line — date, fee, capacity: text or a template. */
  meta?: string | TemplateRef<unknown>
  /** When true, slot is disabled (full / past / unavailable). */
  disabled?: boolean
}

/**
 * Props accepted by {@link TimeSlotPicker} — the same props
 * `@molecule/app-time-slot-picker-react` accepts. The node-valued `title` is
 * projected in Angular (`[slot=title]`) as well as accepted as a text input.
 */
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
  /** Optional title above the slots: text, or `[slot=title]` content. */
  title?: unknown
  /** Extra classes. */
  className?: string
}
