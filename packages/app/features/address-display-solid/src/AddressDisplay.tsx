/**
 * Solid formatted multi-line address display.
 *
 * Solid counterpart of `@molecule/app-address-display-react`'s
 * `AddressDisplay` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { PresentWhileNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { Address, AddressDisplayProps } from './types.js'

/**
 * Converts an Address object into an ordered array of non-empty display lines.
 * @param a
 * @returns The non-empty display lines, in postal order.
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
 * Formatted multi-line address display with optional name, phone, leading
 * slot, and right-side actions. Set `inline` to render all fields on a single
 * line (e.g., in a table cell).
 *
 * This is the Solid counterpart of `@molecule/app-address-display-react`:
 * the same props, the same ClassMap tokens, and the same DOM for the same
 * input.
 *
 * @param props - Component props (see {@link AddressDisplayProps}).
 * @returns The rendered address display.
 */
export const AddressDisplay: Component<AddressDisplayProps> = (props) => {
  const cm = getClassMap()
  const lines = (): string[] => joinAddress(props.address)
  return (
    <div class={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), props.className)}>
      {props.leading}
      <div class={cm.cn(cm.flex1, cm.stack(1), cm.textSize('sm'))}>
        <PresentWhileNode node={props.name}>
          {(name) => <span class={cm.fontWeight('semibold')}>{name()}</span>}
        </PresentWhileNode>
        {props.inline ? (
          <span>{lines().join(', ')}</span>
        ) : (
          <address style={{ 'font-style': 'normal' }}>
            {lines().map((line) => (
              <span style={{ display: 'block' }}>{line}</span>
            ))}
          </address>
        )}
        {props.phone && (
          <a href={`tel:${props.phone}`} class={cm.link}>
            {props.phone}
          </a>
        )}
      </div>
      {props.actions}
    </div>
  )
}
