import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface DetailHeaderProps {
  /** Primary heading. */
  title: ReactNode
  /** Optional subtitle shown below the title. */
  subtitle?: ReactNode
  /** Optional leading avatar / icon / logo. */
  leading?: ReactNode
  /** Optional status indicator (e.g. `<StatusBadge>` or `<StatusPill>`). */
  status?: ReactNode
  /** Right-aligned actions. */
  actions?: ReactNode
  /** Optional metadata row rendered below the main row (chips / secondary fields). */
  meta?: ReactNode
  /** Optional search slot (rendered to the left of the actions). */
  search?: ReactNode
  /** Whether to render with a sticky-top style (position: sticky). */
  sticky?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Header row for a detail page — leading slot + title/subtitle + status +
 * actions, with optional meta row and search slot.
 *
 * Different from `<PageHeader>` (used at the top of list/index pages)
 * in prioritising status + search + stickiness.
 * @param root0
 * @param root0.title
 * @param root0.subtitle
 * @param root0.leading
 * @param root0.status
 * @param root0.actions
 * @param root0.meta
 * @param root0.search
 * @param root0.sticky
 * @param root0.className
 * @param root0.dataMolId
 */
export function DetailHeader({
  title,
  subtitle,
  leading,
  status,
  actions,
  meta,
  search,
  sticky,
  className,
  dataMolId,
}: DetailHeaderProps) {
  const cm = getClassMap()
  return (
    <header
      data-mol-id={dataMolId}
      className={cm.cn(cm.stack(2), className)}
      style={sticky ? { position: 'sticky', top: 0, zIndex: 10 } : undefined}
    >
      <div className={cm.flex({ justify: 'between', align: 'center', gap: 'md', wrap: 'wrap' })}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          {leading}
          <div className={cm.stack(1 as const)}>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>{title}</h1>
              {status}
            </div>
            {subtitle && <p className={cm.textSize('sm')}>{subtitle}</p>}
          </div>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          {search}
          {actions}
        </div>
      </div>
      {meta && <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>{meta}</div>}
    </header>
  )
}
