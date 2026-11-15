/**
 * Types of `@molecule/app-bulk-action-toolbar-angular` — the Angular
 * counterpart of `@molecule/app-bulk-action-toolbar-react`, same props and
 * DOM.
 *
 * @module
 */

/**
 * Descriptor for a single action button rendered inside BulkActionToolbar.
 * Node props (`label`, `icon`) are templated content in Angular (an input
 * cannot carry a node), so they are typed `unknown`: pass plain strings or
 * `<ng-template>` refs.
 */
export interface BulkAction {
  /** Stable id — the `@for` track key of the action's button. */
  id: string
  /** Button label — text or a template ref. */
  label: unknown
  /** Optional leading icon inside the button. */
  icon?: unknown
  /**
   * Called when the action's button is clicked. React's DOM click handler
   * receives the click event, so the callback may take it.
   */
  onClick: (event?: MouseEvent) => void
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
  /** Called when "Clear selection" is clicked (React passes the click event). */
  onClearSelection?: (event?: MouseEvent) => void
  /** Position — `'sticky-bottom'` (default), `'sticky-top'`, or `'inline'`. */
  position?: 'sticky-bottom' | 'sticky-top' | 'inline'
  /** Extra classes. */
  className?: string
}
