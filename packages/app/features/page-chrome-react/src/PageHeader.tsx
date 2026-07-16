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
   * Title emphasis level.
   * - `'normal'` (default) — 3xl bold, for general / reusable list-page
   *   headers.
   * - `'extrabold'` — intended as the larger `text-4xl font-extrabold
   *   tracking-tight` dashboard treatment, but `font-extrabold` is a raw
   *   class literal that appears in no `@source`-scanned dist, so default
   *   Tailwind scaffolds never generate that utility — the title currently
   *   renders at 4xl size with tight tracking at NORMAL font weight (the
   *   `cm.fontWeight('extrabold')` code fix is tracked separately).
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
      ? cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')
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
