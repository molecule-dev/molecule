/**
 * Types for the Vue destructive-action primitives.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/**
 * Props accepted by {@link ConfirmDialog} — the same props
 * `@molecule/app-danger-zone-react` accepts. Node-valued props
 * (`title`, `description`, `confirmLabel`, `cancelLabel`) take a Vue
 * `VNodeChild` (or a string) instead of a React node.
 */
export interface ConfirmDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close (escape, backdrop, cancel). */
  onClose: (event?: unknown) => void
  /** Title. */
  title?: VNodeChild
  /** Body / warning text. */
  description?: VNodeChild
  /** Confirm-button label (e.g. "Delete"). */
  confirmLabel?: VNodeChild
  /** Cancel-button label. */
  cancelLabel?: VNodeChild
  /** Called when the user confirms. */
  onConfirm: () => void | Promise<void>
  /** Is the confirm action destructive? Defaults to true. */
  destructive?: boolean
  /** Extra body content between description and footer. */
  children?: VNodeChild
  /**
   * Disables both buttons. Set it yourself while your `onConfirm` promise is
   * pending — the dialog does not track it and does not auto-close.
   */
  loading?: boolean
}

/** Props accepted by the {@link DangerZoneSection} component. */
export interface DangerZoneSectionProps {
  /** Section title. */
  title?: VNodeChild
  /** Explanation of the destructive action. */
  description?: VNodeChild
  /** Label on the action button (e.g. "Delete account"). */
  actionLabel?: VNodeChild
  /** Called when the button is clicked. */
  onAction?: (event: MouseEvent) => void
  /** When true, the button disables and shows a loading label. */
  loading?: boolean
  /** When true, the button is disabled without loading. */
  disabled?: boolean
  /** Additional content between description and button (e.g. a confirm-text input). */
  children?: VNodeChild
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
