/**
 * Types for the Angular settings actions bar.
 *
 * @module
 */

/**
 * Props accepted by {@link SettingsActionsBar} — the same props
 * `@molecule/app-settings-actions-bar-react` accepts. Node-valued props
 * (`error`, `leading`) are projected content in Angular (an input cannot carry
 * a node), so they are typed `unknown`: pass them in the host template
 * (`[slot=error]` / `[slot=leading]`), not as values.
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
  /** Error text rendered inline (a string input; nodes are `[slot=error]` content). */
  error?: unknown
  /** Sticky-to-bottom. Defaults to true. */
  sticky?: boolean
  /** Content before the buttons (projected as `[slot=leading]`). */
  leading?: unknown
  /** Extra classes. */
  className?: string
}
