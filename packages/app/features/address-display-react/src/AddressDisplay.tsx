import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export interface Address {
  /** First line — street + number. */
  line1?: string
  /** Second line — apartment, suite, unit. */
  line2?: string
  /** City. */
  city?: string
  /** State / province / region. */
  state?: string
  /** ZIP / postal code. */
  postalCode?: string
  /** Country. */
  country?: string
}

interface AddressDisplayProps {
  /** Address fields. */
  address: Address
  /** Optional name / label preceding the address. */
  name?: ReactNode
  /** Optional phone number rendered under the address. */
  phone?: string
  /** Optional `<Icon>` / avatar leading slot. */
  leading?: ReactNode
  /** Optional right-side actions. */
  actions?: ReactNode
  /** Format as a single line instead of multi-line. */
  inline?: boolean
  /** Extra classes. */
  className?: string
}

/**
 *
 * @param a
 */
function joinAddress(a: Address): string[] {
  const lines: string[] = []
  if (a.line1) lines.push(a.line1)
  if (a.line2) lines.push(a.line2)
  const cityState = [a.city, a.state].filter(Boolean).join(', ')
  const cityLine = [cityState, a.postalCode].filter(Boolean).join(' ')
  if (cityLine) lines.push(cityLine)
  if (a.country) lines.push(a.country)
  return lines
}

/**
 * Formatted multi-line address display with optional name, phone,
 * leading slot, and right-side actions. Set `inline` to render all
 * fields on a single line (e.g., in a table cell).
 * @param root0
 * @param root0.address
 * @param root0.name
 * @param root0.phone
 * @param root0.leading
 * @param root0.actions
 * @param root0.inline
 * @param root0.className
 */
export function AddressDisplay({
  address,
  name,
  phone,
  leading,
  actions,
  inline,
  className,
}: AddressDisplayProps) {
  const cm = getClassMap()
  const lines = joinAddress(address)
  const body = inline ? (
    <span>{lines.join(', ')}</span>
  ) : (
    <address style={{ fontStyle: 'normal' }}>
      {lines.map((l, i) => (
        <span key={i} style={{ display: 'block' }}>
          {l}
        </span>
      ))}
    </address>
  )
  return (
    <div className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), className)}>
      {leading}
      <div className={cm.cn(cm.flex1, cm.stack(1 as const), cm.textSize('sm'))}>
        {name && <span className={cm.fontWeight('semibold')}>{name}</span>}
        {body}
        {phone && (
          <a href={`tel:${phone}`} className={cm.link}>
            {phone}
          </a>
        )}
      </div>
      {actions}
    </div>
  )
}
