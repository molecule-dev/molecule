import type { Snippet } from 'svelte'

/** Props accepted by the {@link DetailHeader} component. */
export interface DetailHeaderProps {
  /** Primary heading — a snippet or a plain string. */
  title: Snippet | string
  /** Optional subtitle shown below the title — a snippet or a plain string. */
  subtitle?: Snippet | string
  /** Optional leading avatar / icon / logo — a snippet or a plain string. */
  leading?: Snippet | string
  /** Optional status indicator (e.g. a `<StatusBadge>`) — a snippet or a plain string. */
  status?: Snippet | string
  /** Right-aligned actions — a snippet or a plain string. */
  actions?: Snippet | string
  /** Optional metadata row rendered below the main row — a snippet or a plain string. */
  meta?: Snippet | string
  /** Optional search slot (rendered to the left of the actions) — a snippet or a plain string. */
  search?: Snippet | string
  /** Whether to render with a sticky-top style (position: sticky). */
  sticky?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
