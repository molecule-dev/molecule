/**
 * Types of `@molecule/app-editor-toolbar-svelte` — the Svelte counterpart of
 * `@molecule/app-editor-toolbar-react`, same props and DOM.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** A single action item rendered as a button (or linked button) in the toolbar. */
export interface ToolbarAction {
  /** Stable id — the render key of the action's button. */
  id: string
  /** Button label — text or a snippet. */
  label: Snippet | string
  /** Optional leading icon inside the button. */
  icon?: Snippet | string
  /**
   * Called when the action's button is clicked. React passes the click event
   * through, so the callback may take it.
   */
  onClick?: () => void
  /** Renders the button inside a plain anchor with this href. */
  href?: string
  /** Disables the button. */
  disabled?: boolean
  /** Visual variant — defaults to `'ghost'`. */
  variant?: 'solid' | 'outline' | 'ghost' | 'link'
  /** Optional color variant for emphasis. */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
}

/** Props accepted by the {@link EditorToolbar} component. */
export interface EditorToolbarProps {
  /** Document title. */
  title: Snippet
  /** Optional version / status badge next to the title. */
  badge?: Snippet
  /** Primary actions (e.g. Save, Publish) rendered on the right. */
  primaryActions?: ToolbarAction[]
  /** Secondary icon-only actions (theme, settings, help). */
  secondaryActions?: ToolbarAction[]
  /** Optional leading slot (back button, breadcrumb). */
  leading?: Snippet
  /** Sticky top — defaults to true. */
  sticky?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
