/**
 * Types for the Solid destructive-action primitives.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props accepted by the {@link DangerZoneSection} component. */
export interface DangerZoneSectionProps {
  /** Section title. */
  title?: JSX.Element
  /** Explanation of the destructive action. */
  description?: JSX.Element
  /** Label on the action button (e.g. "Delete account"). */
  actionLabel?: JSX.Element
  /** Called when the button is clicked. */
  onAction?: (event: MouseEvent) => void
  /** When true, the button disables and shows a loading label. */
  loading?: boolean
  /** When true, the button is disabled without loading. */
  disabled?: boolean
  /** Additional content between description and button (e.g. a confirm-text input). */
  children?: JSX.Element
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
