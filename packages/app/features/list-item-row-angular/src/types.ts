/**
 * Types for the Angular generic list-item row.
 *
 * @module
 */

/** Props accepted by the {@link ListItemRow} component (its inputs). */
export interface ListItemRowProps {
  /** Title — first line. A string/number renders as text; nodes are `[slot=title]` projected content. */
  title: string | number
  /** Optional second line (excerpt, description). A string/number renders as text; nodes are `[slot=subtitle]` content. */
  subtitle?: string | number
  /** Optional third line (metadata — timestamps, counts, tags). A string/number renders as text; nodes are `[slot=metadata]` content. */
  metadata?: string | number
  /** Optional leading slot — icon, avatar, thumbnail image (`[slot=leading]` content, or text). */
  leading?: string | number
  /** Optional right-side actions (buttons, action menu; `[slot=actions]` content, or text). */
  actions?: string | number
  /** Called when the row body is clicked; receives the DOM click event. */
  onClick?: (event: Event) => void
  /** When true, sets `aria-selected` on the row — no built-in visual highlight; style it via `className` or host CSS. */
  selected?: boolean
  /** When true, renders in a disabled visual state. */
  disabled?: boolean
  /** Dense vs comfortable spacing. Defaults to `'comfortable'`. */
  density?: 'comfortable' | 'compact'
  /** Extra classes. */
  className?: string
}
