import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Avatar, Card } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** Props for the {@link VendorCard} component. */
export interface VendorCardProps {
  /** Vendor / seller display name. */
  name: ReactNode
  /** Optional logo URL — falls back to Avatar text initials. */
  logoSrc?: string
  /** Tagline / one-liner. */
  description?: ReactNode
  /** 0-5 average rating. */
  rating?: number
  /** Total review count. */
  reviewCount?: number
  /** Member-since date display. */
  memberSince?: ReactNode
  /** Optional badges row (Verified, Top seller, etc.). */
  badges?: ReactNode
  /** Right-side actions (Follow, Message, Visit shop). */
  actions?: ReactNode
  /** Optional click handler on the body. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Vendor / seller / agent profile card. Used in marketplaces, agent
 * directories, multi-tenant catalogs.
 * @param props - Component props (see {@link VendorCardProps}).
 */
export function VendorCard({
  name,
  logoSrc,
  description: descriptionProp,
  rating,
  reviewCount,
  memberSince: memberSinceProp,
  badges,
  actions: actionsProp,
  onClick,
  className,
}: VendorCardProps): JSX.Element {
  const description = slot(descriptionProp)
  const memberSince = slot(memberSinceProp)
  const actions = slot(actionsProp)
  const cm = getClassMap()
  const displayName = typeof name === 'string' ? name : 'Vendor'
  return (
    <Card className={className} onClick={onClick}>
      <Box as="div" className={cm.flex({ align: 'start', gap: 'md' })}>
        <Avatar src={logoSrc} alt={displayName} name={displayName} size="lg" />
        <Box as="div" className={cm.cn(cm.flex1, cm.stack(2))}>
          <Box as="header">
            <Text as="h3" className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
              {name}
            </Text>
            {description && (
              <Text as="p" className={cm.textSize('sm')}>
                {description}
              </Text>
            )}
          </Box>
          <Box as="div" className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            {rating !== undefined && (
              <Box
                as="span"
                className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}
              >
                <Text as="span" aria-hidden>
                  ★
                </Text>
                <Text as="span" className={cm.fontWeight('semibold')}>
                  {rating.toFixed(1)}
                </Text>
                {reviewCount !== undefined && <Text as="span">({reviewCount})</Text>}
              </Box>
            )}
            {memberSince && (
              <Box as="span" className={cm.textSize('xs')}>
                · {memberSince}
              </Box>
            )}
            {badges}
          </Box>
          {actions && (
            <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
              {actions}
            </Box>
          )}
        </Box>
      </Box>
    </Card>
  )
}
