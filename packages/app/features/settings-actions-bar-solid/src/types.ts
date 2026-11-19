/**
 * Types for the Solid settings actions bar.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import type { KitMouseEvent } from '@molecule/app-ui'

/**
 * Props accepted by the {@link SettingsActionsBar} component — the same props
 * `@molecule/app-settings-actions-bar-react` accepts. Node-valued props
 * (`error`, `leading`) take a Solid `JSX.Element` (or a string) instead of a
 * React node.
 */
export interface SettingsActionsBarProps {
  /** Called when Save is clicked. */
  onSave: () => void | Promise<void>
  /**
   * Called when Cancel is clicked (with the click event, as React's
   * `onClick={onCancel}` forwards it). Hides Cancel if omitted.
   */
  onCancel?: (event?: KitMouseEvent) => void
  /** When true, the Save button disables and shows a loading label. */
  loading?: boolean
  /** When true, the Save button is disabled without a loading label. */
  disabled?: boolean
  /** When set, shows a "Saved" badge with the relative time. Epoch ms. */
  savedAt?: number | null
  /** Error text rendered inline. */
  error?: JSX.Element
  /** Sticky-to-bottom. Defaults to true. */
  sticky?: boolean
  /** Additional content rendered before the buttons (status indicator, last-edited info). */
  leading?: JSX.Element
  /** Extra classes. */
  className?: string
}
