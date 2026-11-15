/**
 * Types of `@molecule/app-bulk-action-toolbar-solid` — the Solid counterpart
 * of `@molecule/app-bulk-action-toolbar-react`, same props and DOM.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Descriptor for a single action button rendered inside BulkActionToolbar. */
export interface BulkAction {
  /** Stable id — the render key of the action's button. */
  id: string
  /** Button label. */
  label: JSX.Element
  /** Optional leading icon inside the button. */
  icon?: JSX.Element
  /** Called when the action's button is clicked. */
  onClick: () => void
  /** Renders the button as a solid error-colored (destructive) button. */
  destructive?: boolean
  /** Disables the button. */
  disabled?: boolean
}

/** Props accepted by the {@link BulkActionToolbar} component. */
export interface BulkActionToolbarProps {
  /** Selection count — toolbar hides when 0. */
  count: number
  /** Action buttons. */
  actions: BulkAction[]
  /** Called when "Clear selection" is clicked. */
  onClearSelection?: () => void
  /** Position — `'sticky-bottom'` (default), `'sticky-top'`, or `'inline'`. */
  position?: 'sticky-bottom' | 'sticky-top' | 'inline'
  /** Extra classes. */
  className?: string
}
