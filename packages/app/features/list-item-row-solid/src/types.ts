/**
 * Types for the Solid generic list-item row.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import type { OptimisticToggleButtonProps } from '@molecule/app-ui-solid'

/** Props accepted by the {@link ListItemRow} component. */
export interface ListItemRowProps {
  /** Title — first line. */
  title: JSX.Element
  /** Optional second line (excerpt, description). */
  subtitle?: JSX.Element
  /** Optional third line (metadata — timestamps, counts, tags). */
  metadata?: JSX.Element
  /** Optional leading slot — icon, avatar, thumbnail image. */
  leading?: JSX.Element
  /** Optional right-side actions (buttons, action menu). */
  actions?: JSX.Element
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
