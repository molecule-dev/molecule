/**
 * Solid standalone trend delta chip: `▲ 12%`.
 *
 * Solid counterpart of `@molecule/app-trend-chip-react`'s `TrendChip` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { TrendChipProps } from './types.js'

const ARROW = { up: '▲', down: '▼', flat: '–' } as const
const COLOR = { up: '#22c55e', down: '#ef4444', flat: '#94a3b8' } as const

/**
 * Standalone trend delta chip — `▲ 12%` style display for inline placement in
 * row/header/cell contexts. The trend color is applied inline; the layout and
 * type classes come from the ClassMap bond. Same props, same DOM as
 * `@molecule/app-trend-chip-react`'s `TrendChip`.
 *
 * @param props - Component props (see {@link TrendChipProps}).
 * @returns The rendered trend chip.
 */
export const TrendChip: Component<TrendChipProps> = (props) => {
  const cm = getClassMap()
  const dir = (): 'up' | 'down' | 'flat' =>
    props.direction ?? (props.delta > 0 ? 'up' : props.delta < 0 ? 'down' : 'flat')
  const color = (): string => COLOR[dir()]
  const abs = (): number => Math.abs(props.delta)
  const label = (): string => {
    const prefix =
      typeof props.prefix === 'string' || typeof props.prefix === 'number'
        ? String(props.prefix)
        : ''
    return props.ariaLabel ?? `${prefix}${ARROW[dir()]} ${abs()}${props.suffix ?? '%'}`
  }
  return (
    <span
      aria-label={label()}
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        props.className,
      )}
      style={
        props.variant === 'pill'
          ? { padding: '2px 6px', 'border-radius': '999px', background: color(), color: '#fff' }
          : { color: color() }
      }
    >
      {props.prefix}
      <span aria-hidden="true">{ARROW[dir()]}</span>
      <span>
        {abs()}
        {props.suffix ?? '%'}
      </span>
    </span>
  )
}
