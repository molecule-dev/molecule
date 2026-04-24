import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'

interface ListingCardProps {
  /** Slots — usually `<ListingCardMedia>` + `<ListingCardBody>` + `<ListingCardActions>`. */
  children: ReactNode
  /** Called when the card body is clicked (not its actions). */
  onClick?: () => void
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Product / property / listing card shell. Just a `<Card>` with vertical
 * stacking of its children — typically `<ListingCardMedia>` +
 * `<ListingCardBody>` + `<ListingCardActions>`.
 *
 * Use for product tiles, property cards, course cards, listings,
 * and similar content-card layouts.
 *
 * @param root0
 * @param root0.children
 * @param root0.onClick
 * @param root0.className
 * @param root0.dataMolId
 * @example
 * ```tsx
 * <ListingCard>
 *   <ListingCardMedia src={product.image} aspect="4/3" />
 *   <ListingCardBody
 *     title={product.name}
 *     subtitle={product.category}
 *     price={`$${product.price}`}
 *     meta={<StatusPill kind="success">In stock</StatusPill>}
 *   />
 *   <ListingCardActions>
 *     <Button onClick={addToCart}>Add to cart</Button>
 *   </ListingCardActions>
 * </ListingCard>
 * ```
 */
export function ListingCard({ children, onClick, className, dataMolId }: ListingCardProps) {
  const cm = getClassMap()
  return (
    <Card
      data-mol-id={dataMolId}
      onClick={onClick}
      className={cm.cn(onClick ? cm.cursorPointer : undefined, className)}
    >
      <div className={cm.stack(0 as const)}>{children}</div>
    </Card>
  )
}
