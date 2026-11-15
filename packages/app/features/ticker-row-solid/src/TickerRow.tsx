/**
 * Solid financial ticker row: symbol + price + change% + optional icon,
 * sparkline and meta.
 *
 * Solid counterpart of `@molecule/app-ticker-row-react`'s `TickerRow` — the
 * same props (React names), the same DOM for the same input.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { TickerRowProps } from './types.js'

const POSITIVE_COLOR = '#22c55e'
const NEGATIVE_COLOR = '#ef4444'

/**
 * Financial ticker row — symbol + price + change% + optional sparkline.
 * Use for crypto trackers, stock watchlists, market dashboards. `changePct`
 * drives the ▲/▼/– direction and a FIXED green/red hex color applied inline;
 * `price` and `meta` are opaque display nodes — the app owns formatting. With
 * `onClick` the row is a clickable div WITHOUT button semantics — wrap it in
 * your own button/link where keyboard access matters.
 *
 * @param props - Component props (see {@link TickerRowProps}).
 * @returns The rendered ticker row.
 */
export const TickerRow: Component<TickerRowProps> = (props) => {
  const cm = getClassMap()
  const positive = (): boolean => props.changePct !== undefined && props.changePct > 0
  const negative = (): boolean => props.changePct !== undefined && props.changePct < 0
  const color = (): string | undefined =>
    positive() ? POSITIVE_COLOR : negative() ? NEGATIVE_COLOR : undefined
  const arrow = (): string => (positive() ? '▲' : negative() ? '▼' : '–')
  // React's `changeDisplay ?? `${changePct?.toFixed(2)}%``: a defined display
  // wins, else the formatted percentage.
  const changeText = (): JSX.Element | string =>
    props.changeDisplay ?? `${props.changePct?.toFixed(2)}%`
  return (
    <div
      onClick={props.onClick}
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('py', 2),
        props.onClick ? cm.cursorPointer : undefined,
        props.className,
      )}
    >
      {props.icon && <div class={cm.shrink0}>{props.icon}</div>}
      <div class={cm.cn(cm.flex1, cm.stack(0))}>
        <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{props.symbol}</span>
        {props.name && <span class={cm.textSize('xs')}>{props.name}</span>}
      </div>
      {props.sparkline && <div class={cm.shrink0}>{props.sparkline}</div>}
      <div class={cm.cn(cm.textCenter, cm.stack(0))}>
        <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{props.price}</span>
        {(props.changeDisplay !== undefined || props.changePct !== undefined) && (
          <span
            class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
            style={{ color: color() }}
          >
            {arrow() + ' '}
            {changeText()}
          </span>
        )}
      </div>
      {props.meta && <div class={cm.cn(cm.textSize('xs'), cm.shrink0)}>{props.meta}</div>}
    </div>
  )
}
