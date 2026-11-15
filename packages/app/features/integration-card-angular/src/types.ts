/**
 * Types of `@molecule/app-integration-card-angular` — the Angular counterpart
 * of `@molecule/app-integration-card-react`, same props and DOM.
 *
 * @module
 */

/** Connection status for an integration. */
export type IntegrationStatus = 'connected' | 'disconnected' | 'pending' | 'error'

/**
 * Props accepted by {@link IntegrationCard} — the same props
 * `@molecule/app-integration-card-react` accepts. Node props (`icon`, `title`,
 * `description`, `action.label`) are projected content in Angular (an input
 * cannot carry a node), so they are typed `unknown`: pass node content as
 * `[slot=<name>]` children of the host element, and plain strings as the input.
 */
export interface IntegrationCardProps {
  /** Leading icon / logo — a string input, or `[slot=icon]` projected content. */
  icon?: unknown
  /** Integration title — a string input, or `[slot=title]` projected content. */
  title?: unknown
  /** Supporting description — a string input, or `[slot=description]` content. */
  description?: unknown
  /** Current connection status. Defaults to `'disconnected'`. */
  status?: IntegrationStatus
  /** Action button configuration (its `label` may be a projected node template). */
  action?: {
    /** Button label — a string input, or a projected node template. */
    label?: unknown
    /** Click handler (receives the DOM click event, as React's handler does). */
    onClick?: (event?: Event) => void
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
