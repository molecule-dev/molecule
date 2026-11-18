/**
 * Types for the Angular generic list-item row.
 *
 * @module
 */

import type { ButtonVariant, ColorVariant, Size } from '@molecule/app-ui'

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
  /** Loaded boolean action rendered as its own native button, independently of read-only metadata. */
  toggle?: {
    /** The loaded server value. */
    value: boolean
    /** Saves the desired boolean and resolves with the server-confirmed boolean. */
    commit: (desired: boolean) => Promise<boolean>
    /** Label when the displayed value is true. */
    activeLabel?: string | number
    /** Label when the displayed value is false. */
    inactiveLabel?: string | number
    /** Receives a failed save after the toggle restored the last confirmed value. */
    onError?: (error: unknown) => void
    /** Button variant. */
    variant?: ButtonVariant
    /** Button color. */
    color?: ColorVariant
    /** Button size. */
    size?: Size
    /** Whether the button stretches to fill its container. */
    fullWidth?: boolean
    /** Disables the toggle (permissions, never a pending save). */
    disabled?: boolean
    /** Extra classes. */
    className?: string
    /** `data-testid`. */
    testId?: string
  }
  /**
   * Called when the row is activated (called bare, the way React forwards the
   * open button's click). The whole row is clickable through a transparent
   * native button over it, named by the title; the inner controls (the
   * `actions` slot) sit above it and keep their own clicks.
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
