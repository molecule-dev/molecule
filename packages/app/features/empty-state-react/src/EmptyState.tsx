import type { JSX, ReactElement, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/** Props for {@link EmptyState}. */
export interface EmptyStateProps {
  /** Visual — typically an `<Icon>` or `<img>`. Rendered in a circular badge above the heading. */
  icon?: ReactNode
  /** Primary heading for a general, unselected collection. */
  title: ReactNode
  /** Supporting description shown below the heading. */
  description?: ReactNode
  /** Optional action for a general empty state. */
  action?: ReactNode
  /** Selected views use the component's view-owned props instead. */
  view?: never
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Override outer wrapper classes (for per-app dashed-border, background, padding, etc.). */
  className?: string
  /** Override the icon-badge wrapper classes. */
  iconWrapperClassName?: string
}

/** Selected-view content stays together, without changing the extendable public interface. */
type SelectedViewEmptyStateProps = Omit<
  EmptyStateProps,
  'title' | 'description' | 'action' | 'view'
> & {
  /** The selected view's translated message and required recovery element. */
  view: {
    title: ReactNode
    description?: ReactNode
    action: ReactElement
  }
  title?: never
  description?: never
  action?: never
}

/**
 * Generic centred empty-state panel for lists, feeds, boards, and tables.
 *
 * Renders a vertical stack of [icon, title, description, action]. Typography
 * and spacing come from the wired ClassMap; per-app accent chrome (dashed
 * borders, tinted backgrounds, gradient CTAs) is passed via `className`
 * on the outer element.
 *
 * @param props - Component props (see {@link EmptyStateProps}).
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
  view,
  dataMolId,
  className,
  iconWrapperClassName,
}: EmptyStateProps | SelectedViewEmptyStateProps): JSX.Element {
  const cm = getClassMap()
  const content = view ?? { title, description, action }
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
      <h3 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
        {content.title}
      </h3>
      {content.description && (
        <p className={cm.cn(cm.maxW('md'), cm.sp('mb', content.action ? 6 : 0))}>
          {content.description}
        </p>
      )}
      {content.action}
    </section>
  )
}
