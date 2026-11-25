import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** Props for {@link ListingCardBody}. */
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
  subtitle: subtitleProp,
  price: priceProp,
  meta: metaProp,
  className,
}: ListingCardBodyProps): JSX.Element {
  const subtitle = slot(subtitleProp)
  const price = slot(priceProp)
  const meta = slot(metaProp)
  const cm = getClassMap()
  return (
    <Box as="div" className={cm.cn(cm.stack(1 as const), cm.sp('p', 3), className)}>
      <Text as="h3" className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
        {title}
      </Text>
      {subtitle && (
        <Text as="p" className={cm.textSize('sm')}>
          {subtitle}
        </Text>
      )}
      {price && (
        <Text as="p" className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {price}
        </Text>
      )}
      {meta && (
        <Box as="div" className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {meta}
        </Box>
      )}
    </Box>
  )
}
