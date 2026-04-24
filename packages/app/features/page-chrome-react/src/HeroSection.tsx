import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface HeroSectionProps {
  /** Small eyebrow line above the headline. */
  eyebrow?: ReactNode
  /** Primary headline. */
  title: ReactNode
  /** Supporting description. */
  description?: ReactNode
  /** Primary call-to-action. */
  primaryAction?: ReactNode
  /** Optional secondary call-to-action. */
  secondaryAction?: ReactNode
  /** Optional visual / illustration slot, positioned to the right at md+. */
  media?: ReactNode
  /** Horizontal alignment — defaults to `start`. */
  align?: 'start' | 'center'
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Dashboard / landing hero. Text column on the left, optional media on
 * the right. Alignment defaults to `start` for dashboards; use
 * `align="center"` for marketing-style landing heroes.
 * @param root0
 * @param root0.eyebrow
 * @param root0.title
 * @param root0.description
 * @param root0.primaryAction
 * @param root0.secondaryAction
 * @param root0.media
 * @param root0.align
 * @param root0.className
 * @param root0.dataMolId
 */
export function HeroSection({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  media,
  align = 'start',
  className,
  dataMolId,
}: HeroSectionProps) {
  const cm = getClassMap()
  return (
    <section
      data-mol-id={dataMolId}
      className={cm.cn(
        cm.flex({ align: 'center', justify: media ? 'between' : 'start', gap: 'lg', wrap: 'wrap' }),
        cm.sp('py', 10),
        className,
      )}
    >
      <div className={cm.cn(cm.stack(4), cm.flex1, align === 'center' ? cm.textCenter : undefined)}>
        {eyebrow && (
          <div className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{eyebrow}</div>
        )}
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('bold'))}>{title}</h1>
        {description && <p className={cm.cn(cm.textSize('lg'), cm.maxW('2xl'))}>{description}</p>}
        {(primaryAction || secondaryAction) && (
          <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            {primaryAction}
            {secondaryAction}
          </div>
        )}
      </div>
      {media && <div className={cm.shrink0}>{media}</div>}
    </section>
  )
}
