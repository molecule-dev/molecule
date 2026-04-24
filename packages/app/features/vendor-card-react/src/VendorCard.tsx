import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Avatar, Card } from '@molecule/app-ui-react'

interface VendorCardProps {
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
 * @param root0
 * @param root0.name
 * @param root0.logoSrc
 * @param root0.description
 * @param root0.rating
 * @param root0.reviewCount
 * @param root0.memberSince
 * @param root0.badges
 * @param root0.actions
 * @param root0.onClick
 * @param root0.className
 */
export function VendorCard({
  name,
  logoSrc,
  description,
  rating,
  reviewCount,
  memberSince,
  badges,
  actions,
  onClick,
  className,
}: VendorCardProps) {
  const cm = getClassMap()
  const displayName = typeof name === 'string' ? name : 'Vendor'
  return (
    <Card className={className} onClick={onClick}>
      <div className={cm.flex({ align: 'start', gap: 'md' })}>
        <Avatar src={logoSrc} alt={displayName} name={displayName} size="lg" />
        <div className={cm.cn(cm.flex1, cm.stack(2))}>
          <header>
            <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{name}</h3>
            {description && <p className={cm.textSize('sm')}>{description}</p>}
          </header>
          <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            {rating !== undefined && (
              <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
                <span aria-hidden>★</span>
                <span className={cm.fontWeight('semibold')}>{rating.toFixed(1)}</span>
                {reviewCount !== undefined && <span>({reviewCount})</span>}
              </span>
            )}
            {memberSince && <span className={cm.textSize('xs')}>· {memberSince}</span>}
            {badges}
          </div>
          {actions && <div className={cm.flex({ align: 'center', gap: 'sm' })}>{actions}</div>}
        </div>
      </div>
    </Card>
  )
}
