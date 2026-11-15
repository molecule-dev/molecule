/**
 * Types of `@molecule/app-danger-zone-angular` — the Angular counterpart of
 * `@molecule/app-danger-zone-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link ConfirmDialog} — the same props
 * `@molecule/app-danger-zone-react` accepts. Node-valued props (`title`,
 * `description`) are projected content in Angular (an input cannot carry a
 * node), so they are typed `unknown`; `children` is the element's default
 * projection. Callbacks use React's names: the component's `close`/`confirm`
 * outputs are the same contract.
 */
export interface ConfirmDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close (escape, backdrop, cancel). */
  onClose?: (event?: unknown) => void
  /** Title (nodes are `[slot=title]` content). */
  title?: unknown
  /** Body / warning text (nodes are `[slot=description]` content). */
  description?: unknown
  /** Confirm-button label (e.g. "Delete"). */
  confirmLabel?: string
  /** Cancel-button label. */
  cancelLabel?: string
  /** Called when the user confirms. */
  onConfirm?: () => void | Promise<void>
  /** Is the confirm action destructive? Defaults to true. */
  destructive?: boolean
  /** Extra body content between description and footer (default projection). */
  children?: unknown
  /** Disables both buttons; the caller owns the pending state. */
  loading?: boolean
}

/**
 * Props accepted by {@link DangerZoneSection} — the same props
 * `@molecule/app-danger-zone-react` accepts. Node props (`title`,
 * `description`, `actionLabel`, `children`) are projected content in Angular
 * (an input cannot carry a node), so they are typed `unknown`: pass them in
 * the host template (`[slot=title]`, `[slot=description]`,
 * `[slot=actionLabel]` and default content), not as values.
 */
export interface DangerZoneSectionProps {
  /** Section title (string/number renders as text; nodes are `[slot=title]` content). */
  title?: unknown
  /** Explanation of the destructive action (nodes are `[slot=description]` content). */
  description?: unknown
  /** Label on the action button (nodes are `[slot=actionLabel]` content). */
  actionLabel?: unknown
  /** Called when the button is clicked; receives the DOM click event. */
  onAction?: (event: MouseEvent) => void
  /** When true, the button disables and shows a loading label. */
  loading?: boolean
  /** When true, the button is disabled without loading. */
  disabled?: boolean
  /** Additional content between description and button (e.g. a confirm-text input), projected as the element's default content. */
  children?: unknown
  /** Extra classes on the Card (the host element). */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
