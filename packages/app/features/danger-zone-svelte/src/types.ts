/**
 * Types for the Svelte destructive-action primitives.
 *
 * @module
 */

import type { Snippet } from 'svelte'

import type { ReactNodeProp } from './node-prop.js'

/** Props accepted by the {@link DangerZoneSection} component. */
export interface DangerZoneSectionProps {
  /** Section title. */
  title?: ReactNodeProp
  /** Explanation of the destructive action. */
  description?: ReactNodeProp
  /** Label on the action button (e.g. "Delete account"). */
  actionLabel?: ReactNodeProp
  /** Called when the button is clicked. */
  onAction?: (event: MouseEvent) => void
  /** When true, the button disables and shows a loading label. */
  loading?: boolean
  /** When true, the button is disabled without loading. */
  disabled?: boolean
  /** Additional content between description and button (e.g. a confirm-text input). */
  children?: Snippet
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
