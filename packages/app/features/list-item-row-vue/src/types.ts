/**
 * Types for the Vue generic list-item row.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link ListItemRow} component. */
export interface ListItemRowProps {
  /** Title — first line. A prop or the same-named slot — both work. */
  title: VNodeChild
  /** Optional second line (excerpt, description). A prop or the same-named slot — both work. */
  subtitle?: VNodeChild
  /** Optional third line (metadata — timestamps, counts, tags). A prop or the same-named slot — both work. */
  metadata?: VNodeChild
  /** Optional leading slot — icon, avatar, thumbnail image. A prop or the same-named slot — both work. */
  leading?: VNodeChild
  /** Optional right-side actions (buttons, action menu). A prop or the same-named slot — both work. */
  actions?: VNodeChild
  /**
   * Called when the row is activated. The whole row is clickable through a
   * transparent native button over it, named by the title; the inner controls
   * (the `actions` slot) sit above it and keep their own clicks.
   */
  onClick?: () => void
  /** When true, sets `aria-current="true"` on the row — no built-in visual highlight; style it via `className` or host CSS. */
  selected?: boolean
  /** When true, renders in a disabled visual state. */
  disabled?: boolean
  /** Dense vs comfortable spacing. Defaults to `'comfortable'`. */
  density?: 'comfortable' | 'compact'
  /** Extra classes. */
  className?: string
}
