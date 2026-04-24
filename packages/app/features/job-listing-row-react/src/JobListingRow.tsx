import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface JobListingRowProps {
  title: ReactNode
  /** Company / employer display. */
  company?: ReactNode
  /** Location string ("Remote · US" / "London, UK"). */
  location?: ReactNode
  /** Employment type ("Full-time", "Contract", "Internship"). */
  type?: ReactNode
  /** Salary range display ("$80k–$120k"). */
  salary?: ReactNode
  /** Posted-at relative or absolute display. */
  postedAt?: ReactNode
  /** Optional company logo / icon. */
  leading?: ReactNode
  /** Optional right-side actions (Save, Apply). */
  actions?: ReactNode
  /** Tags / chips (Remote, React, Hybrid). */
  tags?: ReactNode
  /** Click handler on the row. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Job-board row — title + company + location + type + salary + posted
 * date with optional tags and right-side actions.
 * @param root0
 * @param root0.title
 * @param root0.company
 * @param root0.location
 * @param root0.type
 * @param root0.salary
 * @param root0.postedAt
 * @param root0.leading
 * @param root0.actions
 * @param root0.tags
 * @param root0.onClick
 * @param root0.className
 */
export function JobListingRow({
  title,
  company,
  location,
  type,
  salary,
  postedAt,
  leading,
  actions,
  tags,
  onClick,
  className,
}: JobListingRowProps) {
  const cm = getClassMap()
  return (
    <div
      onClick={onClick}
      className={cm.cn(
        cm.flex({ align: 'start', gap: 'md' }),
        cm.sp('p', 3),
        onClick ? cm.cursorPointer : undefined,
        className,
      )}
    >
      {leading && <div className={cm.shrink0}>{leading}</div>}
      <div className={cm.cn(cm.flex1, cm.stack(1 as const))}>
        <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{title}</h3>
        {company && <span className={cm.textSize('sm')}>{company}</span>}
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {location && <span className={cm.textSize('xs')}>📍 {location}</span>}
          {type && <span className={cm.textSize('xs')}>· {type}</span>}
          {salary && (
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>· {salary}</span>
          )}
          {postedAt && <span className={cm.textSize('xs')}>· {postedAt}</span>}
        </div>
        {tags && (
          <div className={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>{tags}</div>
        )}
      </div>
      {actions && (
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0)}>{actions}</div>
      )}
    </div>
  )
}
