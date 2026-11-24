import { type JSX, type ReactNode, useId } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'

/** Props for {@link JobListingRow}. */
export interface JobListingRowProps {
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
  /**
   * Activates the row: while it is set, an empty, transparent native button
   * covers the whole row and calls this on click — the whole row is the click
   * target, and Enter / Space activate the button natively. The row is named
   * by the title (the `<h3>` itself takes the id the button points at with
   * `aria-labelledby`); the `actions` and `tags` slots sit above the button
   * and keep their own clicks.
   */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Job-board row — title + company + location + type + salary + posted
 * date with optional tags and right-side actions. Pass `onClick` to make the
 * whole row clickable through a transparent native button over it.
 * @param props - Component props (see {@link JobListingRowProps}).
 */
export function JobListingRow({
  title,
  company: companyProp,
  location,
  type,
  salary,
  postedAt,
  leading: leadingProp,
  actions: actionsProp,
  tags: tagsProp,
  onClick,
  className,
}: JobListingRowProps): JSX.Element {
  const company = slot(companyProp)
  const leading = slot(leadingProp)
  const actions = slot(actionsProp)
  const tags = slot(tagsProp)
  const cm = getClassMap()
  // The row's accessible name lives on the title: the open button points at
  // the `<h3>` with aria-labelledby, so the row reads as its title.
  const nameId = useId()
  // The row's open control: an empty, transparent native button covering the
  // whole row (Enter / Space activate it natively), a SIBLING of the slot
  // wrappers rather than their parent, so the raised slots stay reachable
  // controls and keep their own clicks.
  const openButton = onClick ? (
    <button
      type="button"
      aria-labelledby={nameId}
      data-mol-id="job-listing-row-open"
      onClick={() => onClick()}
      /* mol-bespoke-button: the whole row is the hit area, not a CTA — an
         empty, transparent button over the row; the inline background/border/
         padding are native resets. */
      className={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
      style={{ background: 'transparent', border: 'none', padding: 0 }}
    />
  ) : null
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'start', gap: 'md' }),
        cm.sp('p', 3),
        onClick ? cm.position('relative') : undefined,
        className,
      )}
    >
      {openButton}
      {leading && <div className={cm.shrink0}>{leading}</div>}
      <div className={cm.cn(cm.flex1, cm.stack(1 as const))}>
        <h3 id={nameId} className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
          {title}
        </h3>
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
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
              cm.position('relative'),
            )}
          >
            {tags}
          </div>
        )}
      </div>
      {actions && (
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.shrink0,
            cm.position('relative'),
          )}
        >
          {actions}
        </div>
      )}
    </div>
  )
}
