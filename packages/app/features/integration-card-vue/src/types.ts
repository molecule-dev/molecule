/**
 * Types for the Vue integration / connection card.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Connection status for an integration. */
export type IntegrationStatus = 'connected' | 'disconnected' | 'pending' | 'error'

/** Props for the {@link IntegrationCard} component. */
export interface IntegrationCardProps {
  /**
   * Leading icon / logo for the integration. Passed as a prop or as the
   * same-named slot — both work.
   */
  icon?: VNodeChild
  /** Integration title (a prop or the same-named slot). */
  title?: VNodeChild
  /** Supporting description (a prop or the same-named slot). */
  description?: VNodeChild
  /** Current connection status. Defaults to `'disconnected'`. */
  status?: IntegrationStatus
  /** Action button configuration. */
  action?: {
    /** Button label — passed as a prop or as the same-named slot. */
    label?: VNodeChild
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
