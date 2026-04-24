import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface PageHeaderProps {
  /** Primary heading (usually `t('...')`). */
  title: ReactNode
  /** Optional subheading rendered below the title. */
  subtitle?: ReactNode
  /** Optional leading icon next to the title. */
  icon?: ReactNode
  /** Optional breadcrumb trail rendered above the title row. */
  breadcrumbs?: ReactNode
  /** Right-aligned actions (buttons, menus, etc.). */
  actions?: ReactNode
  /** Optional meta row rendered below the title/subtitle (status chips, timestamps, etc.). */
  meta?: ReactNode
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes on the outer wrapper. */
  className?: string
}

/**
 * Standard page-top header with optional breadcrumbs, leading icon,
 * title / subtitle pair, meta row, and right-aligned actions.
 *
 * Layout: breadcrumbs, then a two-column row with title+subtitle on the
 * left and actions on the right, then optional meta.
 * @param root0
 * @param root0.title
 * @param root0.subtitle
 * @param root0.icon
 * @param root0.breadcrumbs
 * @param root0.actions
 * @param root0.meta
 * @param root0.dataMolId
 * @param root0.className
 */
export function PageHeader({
  title,
  subtitle,
  icon,
  breadcrumbs,
  actions,
  meta,
  dataMolId,
  className,
}: PageHeaderProps) {
  const cm = getClassMap()
  return (
    <header data-mol-id={dataMolId} className={cm.cn(cm.stack(3), className)}>
      {breadcrumbs}
      <div className={cm.flex({ justify: 'between', align: 'start', gap: 'md' })}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          {icon}
          <div className={cm.stack(1 as const)}>
            <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{title}</h1>
            {subtitle && <p className={cm.textSize('base')}>{subtitle}</p>}
          </div>
        </div>
        {actions && <div className={cm.flex({ align: 'center', gap: 'sm' })}>{actions}</div>}
      </div>
      {meta && <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>{meta}</div>}
    </header>
  )
}
