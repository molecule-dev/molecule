import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-react'

export interface UserChipProps {
  /** Display name. */
  name: string
  /** Optional avatar image URL. */
  src?: string
  /** Optional secondary line (role / email / handle). */
  subtitle?: ReactNode
  /** Optional trailing content (action button, status dot, etc.). */
  trailing?: ReactNode
  /** Avatar size preset. */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Extra classes on the outer row. */
  className?: string
}

/**
 * Avatar + name + optional subtitle row — useful in dropdowns, mention
 * pickers, assignment popovers, and row-level user references.
 * @param props - Component props (see {@link UserChipProps}).
 */
export function UserChip({
  name,
  src,
  subtitle,
  trailing,
  size = 'sm',
  className,
}: UserChipProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}>
      <Avatar src={src} alt={name} name={name} size={size} />
      <div className={cm.cn(cm.flex1, cm.stack(0 as const))}>
        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{name}</span>
        {subtitle && <span className={cm.textSize('xs')}>{subtitle}</span>}
      </div>
      {trailing}
    </div>
  )
}
