import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-react'

/**
 *
 */
export interface ContactFields {
  name: string
  email?: string
  phone?: string
  role?: ReactNode
  avatarSrc?: string
  address?: ReactNode
  company?: ReactNode
}

interface ContactDisplayProps {
  contact: ContactFields
  /** Layout preset. */
  layout?: 'card' | 'row' | 'compact'
  /** Optional right-side actions. */
  actions?: ReactNode
  /** Click handler on the row. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Formatted contact display — avatar + name + role + email/phone with
 * leading icons + optional address and company. Three layouts for
 * different densities.
 * @param root0
 * @param root0.contact
 * @param root0.layout
 * @param root0.actions
 * @param root0.onClick
 * @param root0.className
 */
export function ContactDisplay({
  contact,
  layout = 'card',
  actions,
  onClick,
  className,
}: ContactDisplayProps) {
  const cm = getClassMap()
  const { name, email, phone, role, avatarSrc, address, company } = contact
  const isCompact = layout === 'compact'
  const direction = layout === 'card' ? 'col' : 'row'
  return (
    <div
      onClick={onClick}
      className={cm.cn(
        cm.flex({
          align: layout === 'card' ? 'start' : 'center',
          gap: isCompact ? 'sm' : 'md',
          direction: direction === 'col' ? 'row' : 'row',
        }),
        onClick ? cm.cursorPointer : undefined,
        className,
      )}
    >
      <div className={cm.shrink0}>
        <Avatar src={avatarSrc} alt={name} name={name} size={isCompact ? 'sm' : 'md'} />
      </div>
      <div className={cm.cn(cm.flex1, cm.stack(1 as const))}>
        <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
          <span
            className={cm.cn(cm.textSize(isCompact ? 'sm' : 'base'), cm.fontWeight('semibold'))}
          >
            {name}
          </span>
          {role && <span className={cm.textSize('xs')}>{role}</span>}
        </div>
        {company && <div className={cm.textSize('sm')}>{company}</div>}
        {!isCompact && email && (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
            <span aria-hidden>✉</span>
            <a href={`mailto:${email}`} className={cm.link}>
              {email}
            </a>
          </div>
        )}
        {!isCompact && phone && (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
            <span aria-hidden>☎</span>
            <a href={`tel:${phone}`} className={cm.link}>
              {phone}
            </a>
          </div>
        )}
        {!isCompact && address && (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
            <span aria-hidden>⌂</span>
            <span>{address}</span>
          </div>
        )}
      </div>
      {actions}
    </div>
  )
}
