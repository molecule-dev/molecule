/**
 * Types for the Vue detail-page header.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link DetailHeader} component. */
export interface DetailHeaderProps {
  /** Primary heading. Passed as a prop or as the same-named slot — both work. */
  title: VNodeChild
  /** Optional subtitle shown below the title. Passed as a prop or a slot. */
  subtitle?: VNodeChild
  /** Optional leading avatar / icon / logo. Passed as a prop or a slot. */
  leading?: VNodeChild
  /** Optional status indicator (e.g. `<StatusBadge>` or `<StatusPill>`). Passed as a prop or a slot. */
  status?: VNodeChild
  /** Right-aligned actions. Passed as a prop or a slot. */
  actions?: VNodeChild
  /** Optional metadata row rendered below the main row (chips / secondary fields). Passed as a prop or a slot. */
  meta?: VNodeChild
  /** Optional search slot (rendered to the left of the actions). Passed as a prop or a slot. */
  search?: VNodeChild
  /** Whether to render with a sticky-top style (position: sticky). */
  sticky?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
