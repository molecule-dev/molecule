/**
 * Types for the Svelte generic list-item row.
 *
 * @module
 */

import type { Snippet } from 'svelte'

import type { OptimisticToggleButtonProps } from '@molecule/app-ui-svelte'

/** Props accepted by the {@link ListItemRow} component. */
export interface ListItemRowProps {
  /** Title — first line. A snippet renders inline. */
  title: Snippet | string | number
  /** Optional second line (excerpt, description). A snippet renders inline. */
  subtitle?: Snippet | string | number
  /** Optional third line (metadata — timestamps, counts, tags). A snippet renders inline. */
  metadata?: Snippet | string | number
  /** Optional leading slot — icon, avatar, thumbnail image. A snippet renders inline. */
  leading?: Snippet | string | number
  /** Optional right-side actions (buttons, action menu). A snippet renders inline. */
  actions?: Snippet | string | number
  /** Loaded boolean action rendered as its own native button, independently of read-only metadata. */
  toggle?: OptimisticToggleButtonProps
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
