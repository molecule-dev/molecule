/**
 * Types of `@molecule/app-editor-toolbar-angular` — the Angular counterpart of
 * `@molecule/app-editor-toolbar-react`, same props and DOM.
 *
 * @module
 */

/**
 * A single action item rendered as a button (or linked button) in the toolbar.
 *
 * Node-valued fields (`label`, `icon`) are templated content in Angular (an
 * input cannot carry a node), so they are typed `unknown`: pass plain strings
 * or `<ng-template>` refs.
 */
export interface ToolbarAction {
  /** Stable id — the `@for` track key of the action's button. */
  id: string
  /** Button label — text or a template ref. */
  label: unknown
  /** Optional leading icon inside the button — text or a template ref. */
  icon?: unknown
  /**
   * Called when the action's button is clicked. React's DOM click handler
   * receives the click event, so the callback may take it.
   */
  onClick?: (event?: MouseEvent) => void
  /** Renders the button inside a plain anchor with this href. */
  href?: string
  /** Disables the button. */
  disabled?: boolean
  /** Visual variant — defaults to `'ghost'`. */
  variant?: 'solid' | 'outline' | 'ghost' | 'link'
  /** Optional color variant for emphasis. */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
}

/**
 * Props accepted by {@link EditorToolbar} — the same props
 * `@molecule/app-editor-toolbar-react` accepts. Node props (`title`, `badge`,
 * `leading`) are projected content in Angular (an input cannot carry a node),
 * so they are typed `unknown`: pass them in the host template, not as values.
 */
export interface EditorToolbarProps {
  /** Document title, projected as `[slot=title]` content. */
  title: unknown
  /** Optional version / status badge, projected as `[slot=badge]` content. */
  badge?: unknown
  /** Primary actions (e.g. Save, Publish) rendered on the right. */
  primaryActions?: ToolbarAction[]
  /** Secondary icon-only actions (theme, settings, help). */
  secondaryActions?: ToolbarAction[]
  /** Optional leading slot (back button, breadcrumb), projected as `[slot=leading]`. */
  leading?: unknown
  /** Sticky top — defaults to true. */
  sticky?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
