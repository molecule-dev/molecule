import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface CtaCardProps {
  /** Optional small eyebrow line above the title. */
  eyebrow?: ReactNode
  /** Primary heading. */
  title: ReactNode
  /** Supporting copy. */
  description?: ReactNode
  /** Primary call-to-action. */
  action?: ReactNode
  /** Optional visual / illustration rendered at the top or side. */
  media?: ReactNode
  /** `'horizontal'` renders media beside text; `'vertical'` stacks them. Defaults to `'vertical'`. */
  layout?: 'vertical' | 'horizontal'
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Override outer wrapper classes. */
  className?: string
}

/**
 * A "soft sell" card used to promote a next-step action inside a page
 * body (e.g., "Connect your bank", "Invite teammates").
 *
 * Differs from `<EmptyState>` in being positioned in a list of cards
 * rather than filling the void. Supports a horizontal layout with the
 * media slot beside the text.
 * @param root0
 * @param root0.eyebrow
 * @param root0.title
 * @param root0.description
 * @param root0.action
 * @param root0.media
 * @param root0.layout
 * @param root0.dataMolId
 * @param root0.className
 */
export function CtaCard({
  eyebrow,
  title,
  description,
  action,
  media,
  layout = 'vertical',
  dataMolId,
  className,
}: CtaCardProps) {
  const cm = getClassMap()
  const direction = layout === 'horizontal' ? 'row' : 'col'
  return (
    <section
      data-mol-id={dataMolId}
      className={cm.cn(
        cm.flex({ direction, align: layout === 'horizontal' ? 'center' : 'stretch', gap: 'md' }),
        cm.sp('p', 6),
        className,
      )}
    >
      {media && <div className={cm.shrink0}>{media}</div>}
      <div className={cm.cn(cm.flex1, cm.stack(2))}>
        {eyebrow && (
          <div className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{eyebrow}</div>
        )}
        <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>{title}</h3>
        {description && <p>{description}</p>}
        {action && <div className={cm.sp('mt', 2)}>{action}</div>}
      </div>
    </section>
  )
}
