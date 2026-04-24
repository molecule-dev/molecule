import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface ListingCardActionsProps {
  /** Action content — buttons, favorite toggle, etc. */
  children: ReactNode
  /** Layout — `'horizontal'` (default) fills width, `'stacked'` is vertical. */
  layout?: 'horizontal' | 'stacked'
  /** Extra classes. */
  className?: string
}

/**
 * Bottom action row of a `<ListingCard>` (Add to cart, Save, etc.).
 * @param root0
 * @param root0.children
 * @param root0.layout
 * @param root0.className
 */
export function ListingCardActions({
  children,
  layout = 'horizontal',
  className,
}: ListingCardActionsProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: layout === 'stacked' ? 'col' : 'row', gap: 'sm', align: 'stretch' }),
        cm.sp('p', 3),
        className,
      )}
    >
      {children}
    </div>
  )
}
