import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export interface BreadcrumbItem {
  /** Display text or React node for the crumb. */
  label: ReactNode
  /**
   * Optional `to` target. When absent the crumb renders as plain text
   * (typically the current page).
   */
  to?: string
  /** Optional leading icon. */
  icon?: ReactNode
}

interface BreadcrumbProps {
  /** Ordered list of crumbs, last one usually the current page. */
  items: BreadcrumbItem[]
  /**
   * Click handler invoked with the target `to` when an item is clicked.
   * Useful when wiring to `react-router-dom`'s `useNavigate`. When
   * omitted the component renders items with an anchor `<a href={to}>`.
   */
  onNavigate?: (to: string) => void
  /** Separator between crumbs — defaults to a `/`. Accepts any node. */
  separator?: ReactNode
  /** Extra classes on the `<nav>` element. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Breadcrumb navigation.
 *
 * Each item before the last is rendered as a link; the last item is
 * rendered as plain text (the "current page"). Pass `onNavigate` to
 * intercept clicks (e.g. hand off to `useNavigate()` from react-router).
 * @param root0
 * @param root0.items
 * @param root0.onNavigate
 * @param root0.separator
 * @param root0.className
 * @param root0.dataMolId
 */
export function Breadcrumb({
  items,
  onNavigate,
  separator,
  className,
  dataMolId,
}: BreadcrumbProps) {
  const cm = getClassMap()
  const sep = separator ?? <span aria-hidden>/</span>
  return (
    <nav
      aria-label="Breadcrumb"
      data-mol-id={dataMolId}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
        cm.textSize('sm'),
        className,
      )}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        const content = (
          <span className={cm.flex({ align: 'center', gap: 'xs' })}>
            {item.icon}
            {item.label}
          </span>
        )
        return (
          <span key={i} className={cm.flex({ align: 'center', gap: 'xs' })}>
            {isLast || !item.to ? (
              <span aria-current={isLast ? 'page' : undefined}>{content}</span>
            ) : onNavigate ? (
              <button type="button" onClick={() => onNavigate(item.to!)} className={cm.link}>
                {content}
              </button>
            ) : (
              <a href={item.to} className={cm.link}>
                {content}
              </a>
            )}
            {!isLast && <span>{sep}</span>}
          </span>
        )
      })}
    </nav>
  )
}
