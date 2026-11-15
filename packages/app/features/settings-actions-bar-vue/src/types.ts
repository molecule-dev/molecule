/**
 * Types for the Vue settings actions bar.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/**
 * Props accepted by the {@link SettingsActionsBar} component — the same props
 * `@molecule/app-settings-actions-bar-react` accepts. Node-valued props
 * (`error`, `leading`) take a Vue `VNodeChild` (or a string) instead of a
 * React node, and may also arrive as the same-named slot.
 */
export interface SettingsActionsBarProps {
  /** Called when Save is clicked. */
  onSave: () => void | Promise<void>
  /**
   * Called when Cancel is clicked (with the click event, as React's
   * `onClick={onCancel}` forwards it). Hides Cancel if omitted.
   */
  onCancel?: (event?: MouseEvent) => void
  /** When true, the Save button disables and shows a loading label. */
  loading?: boolean
  /** When true, the Save button is disabled without a loading label. */
  disabled?: boolean
  /** When set, shows a "Saved" badge with the relative time. Epoch ms. */
  savedAt?: number | null
  /** Error text rendered inline. Passed as a prop or as the `error` slot. */
  error?: VNodeChild
  /** Sticky-to-bottom. Defaults to true. */
  sticky?: boolean
  /**
   * Additional content rendered before the buttons (status indicator,
   * last-edited info). Passed as a prop or as the `leading` slot.
   */
  leading?: VNodeChild
  /** Extra classes. */
  className?: string
}
