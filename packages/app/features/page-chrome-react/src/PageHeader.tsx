import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/** Props for {@link PageHeader}. */
export interface PageHeaderProps {
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
  /**
   * Title emphasis level. Both values resolve their weight through
   * `cm.fontWeight(...)`, so the class is a real, theme-scanned utility.
   * - `'normal'` (default) — 3xl `cm.fontWeight('bold')`, for general /
   *   reusable list-page headers.
   * - `'extrabold'` — the larger 4xl `cm.fontWeight('extrabold')` dashboard
   *   treatment (`font-extrabold` is safelisted by `@molecule/app-ui-tailwind`'s
   *   base.css, so it always generates).
   */
  emphasis?: 'normal' | 'extrabold'
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
 * @param props - Component props (see {@link PageHeaderProps}).
 */
export function PageHeader({
  title,
  subtitle,
  icon,
  breadcrumbs,
  actions,
  meta,
  emphasis = 'normal',
  dataMolId,
  className,
}: PageHeaderProps): JSX.Element {
  const cm = getClassMap()
  const titleClass =
    emphasis === 'extrabold'
      ? cm.cn(cm.textSize('4xl'), cm.fontWeight('extrabold'))
      : cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))
  return (
    <header data-mol-id={dataMolId} className={cm.cn(cm.stack(3), className)}>
      {breadcrumbs}
      <div className={cm.flex({ justify: 'between', align: 'start', gap: 'md' })}>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          {icon}
          <div className={cm.stack(1 as const)}>
            <h1 className={titleClass}>{title}</h1>
            {subtitle && <p className={cm.textSize('base')}>{subtitle}</p>}
          </div>
        </div>
        {actions && <div className={cm.flex({ align: 'center', gap: 'sm' })}>{actions}</div>}
      </div>
      {meta && <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>{meta}</div>}
    </header>
  )
}
