import type { ReactElement, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Anchor, Box, Text } from '@molecule/app-ui-react/elements'

/** Structured postal address with optional individual fields. */
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

/** Props for {@link AddressDisplay}. */
export interface AddressDisplayProps {
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
 * Converts an Address object into an ordered array of non-empty display lines.
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
 * @param props - Component props (see {@link AddressDisplayProps}).
 */
export function AddressDisplay({
  address,
  name: nameProp,
  phone,
  leading,
  actions,
  inline,
  className,
}: AddressDisplayProps): ReactElement {
  const name = slot(nameProp)
  const cm = getClassMap()
  const lines = joinAddress(address)
  const body = inline ? (
    <Text as="span">{lines.join(', ')}</Text>
  ) : (
    <Box as="address" webStyle={{ fontStyle: 'normal' }}>
      {lines.map((l, i) => (
        <Text as="span" key={i} webStyle={{ display: 'block' }}>
          {l}
        </Text>
      ))}
    </Box>
  )
  return (
    <Box as="div" className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), className)}>
      {leading}
      <Box as="div" className={cm.cn(cm.flex1, cm.stack(1 as const), cm.textSize('sm'))}>
        {name && (
          <Box as="span" className={cm.fontWeight('semibold')}>
            {name}
          </Box>
        )}
        {body}
        {phone && (
          <Anchor href={`tel:${phone}`} className={cm.link}>
            {phone}
          </Anchor>
        )}
      </Box>
      {actions}
    </Box>
  )
}
