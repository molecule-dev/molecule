import type { JSX } from 'solid-js'

/** Props accepted by the {@link DetailHeader} component. */
export interface DetailHeaderProps {
  /** Primary heading. */
  title: JSX.Element
  /** Optional subtitle shown below the title. */
  subtitle?: JSX.Element
  /** Optional leading avatar / icon / logo. */
  leading?: JSX.Element
  /** Optional status indicator (e.g. `<StatusBadge>` or `<StatusPill>`). */
  status?: JSX.Element
  /** Right-aligned actions. */
  actions?: JSX.Element
  /** Optional metadata row rendered below the main row (chips / secondary fields). */
  meta?: JSX.Element
  /** Optional search slot (rendered to the left of the actions). */
  search?: JSX.Element
  /** Whether to render with a sticky-top style (position: sticky). */
  sticky?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
