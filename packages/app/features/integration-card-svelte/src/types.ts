/**
 * Types of `@molecule/app-integration-card-svelte` — the Svelte counterpart of
 * `@molecule/app-integration-card-react`, same props and DOM.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Connection status for an integration. */
export type IntegrationStatus = 'connected' | 'disconnected' | 'pending' | 'error'

/** Props for the {@link IntegrationCard} component. */
export interface IntegrationCardProps {
  /** Leading icon / logo — a snippet or a plain string. */
  icon?: Snippet | string
  /** Integration title — a snippet or a plain string. */
  title?: Snippet | string
  /** Supporting description — a snippet or a plain string. */
  description?: Snippet | string
  /** Current connection status. Defaults to `'disconnected'`. */
  status?: IntegrationStatus
  /** Action button configuration. */
  action?: {
    /** Button label — a snippet or a plain string. */
    label?: Snippet | string
    /** Click handler (receives the DOM click event, as React's handler does). */
    onClick?: (event?: MouseEvent) => void
    /** When set, the button renders inside a plain anchor to this URL. */
    href?: string
    /** While true on the button branch, the label is replaced by an ellipsis glyph. */
    loading?: boolean
    /** Disables the action. */
    disabled?: boolean
  } | null
  /** `'card'` default, `'cta'` for premium gradient-tinted promos. */
  variant?: 'card' | 'cta'
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
