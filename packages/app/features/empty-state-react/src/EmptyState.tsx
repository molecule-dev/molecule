import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface EmptyStateProps {
  /** Visual — typically an `<Icon>` or `<img>`. Rendered in a circular badge above the heading. */
  icon?: ReactNode
  /** Primary heading text (usually `t('...')`). */
  title: ReactNode
  /** Supporting description shown below the heading. */
  description?: ReactNode
  /** Action area — typically a `<Button>` or `<Link>`. */
  action?: ReactNode
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Override outer wrapper classes (for per-app dashed-border, background, padding, etc.). */
  className?: string
  /** Override the icon-badge wrapper classes. */
  iconWrapperClassName?: string
}

/**
 * Generic centred empty-state panel for lists, feeds, boards, and tables.
 *
 * Renders a vertical stack of [icon, title, description, action]. Typography
 * and spacing come from the wired ClassMap; per-app accent chrome (dashed
 * borders, tinted backgrounds, gradient CTAs) is passed via `className`
 * on the outer element.
 *
 * @param root0
 * @param root0.icon
 * @param root0.title
 * @param root0.description
 * @param root0.action
 * @param root0.dataMolId
 * @param root0.className
 * @param root0.iconWrapperClassName
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<Icon name="verified_user" size={40} />}
 *   title={t('comments.empty.title')}
 *   description={t('comments.empty.description')}
 *   action={<Link to="/new"><Button>Create one</Button></Link>}
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  dataMolId,
  className,
  iconWrapperClassName,
}: EmptyStateProps) {
  const cm = getClassMap()
  return (
    <section
      data-mol-id={dataMolId}
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.textCenter,
        cm.sp('p', 12),
        className,
      )}
    >
      {icon && (
        <div
          className={cm.cn(
            cm.w(20),
            cm.h(20),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.sp('mb', 6),
            iconWrapperClassName,
          )}
        >
          {icon}
        </div>
      )}
      <h3 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>{title}</h3>
      {description && (
        <p className={cm.cn(cm.maxW('md'), cm.sp('mb', action ? 6 : 0))}>{description}</p>
      )}
      {action}
    </section>
  )
}
