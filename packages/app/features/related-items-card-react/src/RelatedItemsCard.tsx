import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'

interface RelatedItemsCardProps<T> {
  /** Card heading. */
  title: ReactNode
  /** Optional leading icon in the header. */
  icon?: ReactNode
  /** Items to render. */
  items: T[]
  /** Render function for each item. */
  renderItem: (item: T, index: number) => ReactNode
  /** Called when an item row is clicked (if applicable). */
  onItemClick?: (item: T, index: number) => void
  /** Rendered when `items` is empty. */
  emptyState?: ReactNode
  /** Optional "View all" link rendered in the header. */
  viewAllHref?: string
  /** Optional right-aligned header actions (e.g. "Add new" button). */
  headerActions?: ReactNode
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Card container for a list of cross-linked / related items.
 *
 * Common usage: "Company → Deals", "Contact → Notes",
 * "Ticket → Related Articles", "Post → Related Posts". Apps supply the
 * item data and a renderer; the card provides consistent header +
 * list + empty-state + view-all chrome.
 * @param root0
 * @param root0.title
 * @param root0.icon
 * @param root0.items
 * @param root0.renderItem
 * @param root0.onItemClick
 * @param root0.emptyState
 * @param root0.viewAllHref
 * @param root0.headerActions
 * @param root0.className
 * @param root0.dataMolId
 */
export function RelatedItemsCard<T>({
  title,
  icon,
  items,
  renderItem,
  onItemClick,
  emptyState,
  viewAllHref,
  headerActions,
  className,
  dataMolId,
}: RelatedItemsCardProps<T>) {
  const cm = getClassMap()
  return (
    <Card className={className} data-mol-id={dataMolId}>
      <div className={cm.stack(3)}>
        <header className={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            {icon}
            <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{title}</h3>
          </div>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            {headerActions}
            {viewAllHref && (
              <a href={viewAllHref} className={cm.cn(cm.textSize('sm'), cm.link)}>
                View all
              </a>
            )}
          </div>
        </header>
        {items.length === 0 ? (
          emptyState
        ) : (
          <ul className={cm.stack(2)}>
            {items.map((item, i) => (
              <li
                key={i}
                onClick={onItemClick ? () => onItemClick(item, i) : undefined}
                className={onItemClick ? cm.cursorPointer : undefined}
              >
                {renderItem(item, i)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
