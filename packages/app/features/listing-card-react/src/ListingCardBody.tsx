import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

export interface ListingCardBodyProps {
  /** Primary title / name. */
  title: ReactNode
  /** Secondary line (subtitle, location, category). */
  subtitle?: ReactNode
  /** Price / metric line. */
  price?: ReactNode
  /** Optional extras row (rating, availability, badges). */
  meta?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Body of a `<ListingCard>` — title / subtitle / price / meta rows stacked.
 * @param props - Component props (see {@link ListingCardBodyProps}).
 */
export function ListingCardBody({
  title,
  subtitle,
  price,
  meta,
  className,
}: ListingCardBodyProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.stack(1 as const), cm.sp('p', 3), className)}>
      <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{title}</h3>
      {subtitle && <p className={cm.textSize('sm')}>{subtitle}</p>}
      {price && <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{price}</p>}
      {meta && <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>{meta}</div>}
    </div>
  )
}
