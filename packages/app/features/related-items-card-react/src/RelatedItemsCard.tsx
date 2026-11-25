import type { JSX, ReactNode } from 'react'

import { getClassMap, type KitKeyboardEvent } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'
import { Box, Link, Pressable, Text } from '@molecule/app-ui-react/elements'

/** Props accepted by the {@link RelatedItemsCard} component. */
export interface RelatedItemsCardProps<T> {
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
 * @param props - Component props (see {@link RelatedItemsCardProps}).
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
}: RelatedItemsCardProps<T>): JSX.Element {
  const cm = getClassMap()

  /**
   * Keyboard activation for a clickable row — the same call the mouse click
   * makes. The row control is a `role="button"` div (an `<li>` may not carry
   * button semantics), so it activates Enter and Space itself;
   * `preventDefault` keeps the browser's own key-driven click from firing the
   * handler a second time.
   */
  const handleRowKeyDown = (event: KitKeyboardEvent, item: T, index: number): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onItemClick?.(item, index)
  }

  return (
    <Card className={className} data-mol-id={dataMolId}>
      <Box as="div" className={cm.stack(3)}>
        <Box as="header" className={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
          <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
            {icon}
            <Text as="h3" className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
              {title}
            </Text>
          </Box>
          <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
            {headerActions}
            {viewAllHref && (
              <Link to={viewAllHref} className={cm.cn(cm.textSize('sm'), cm.link)}>
                View all
              </Link>
            )}
          </Box>
        </Box>
        {items.length === 0 ? (
          emptyState
        ) : (
          <Box as="ul" className={cm.stack(2)}>
            {items.map((item, i) => (
              <Box as="li" key={i}>
                {onItemClick ? (
                  <Pressable
                    as="div"
                    role="button"
                    tabIndex={0}
                    className={cm.cursorPointer}
                    onClick={() => onItemClick(item, i)}
                    onKeyDown={(event) => handleRowKeyDown(event, item, i)}
                  >
                    {renderItem(item, i)}
                  </Pressable>
                ) : (
                  renderItem(item, i)
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Card>
  )
}
