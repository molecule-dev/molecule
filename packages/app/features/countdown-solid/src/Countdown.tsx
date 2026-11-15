/**
 * Solid `Countdown` component: the counterpart of
 * `@molecule/app-countdown-react`'s `Countdown` — the same props (React names),
 * the same DOM for the same input.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import { formatDisplay } from './state.js'
import type { CountdownProps } from './types.js'
import { useCountdown } from './useCountdown.js'

/**
 * Resolves a node-valued prop that may arrive as an accessor: Solid's own
 * props idiom, and how the conformance kit hands a node prop to a component.
 *
 * @param value - The node, or an accessor of it.
 * @returns The node itself.
 */
const nodeOf = (value: JSX.Element | (() => JSX.Element) | undefined): JSX.Element | undefined =>
  typeof value === 'function' ? (value as () => JSX.Element)() : value

/**
 * Live countdown display with three default formats:
 * - `'compact'` — `3d 4h 12m 5s` (skips zero leading units)
 * - `'long'` — `3 days 4 hours 12 minutes 5 seconds`
 * - `'colon'` — `03:04:12:05`
 *
 * Pass `render` for full control over markup. Once the target has passed and
 * an `expired` node was given, that node renders instead of the display.
 *
 * @param props - Component props (see {@link CountdownProps}).
 * @returns The rendered countdown.
 */
export const Countdown: Component<CountdownProps> = (props) => {
  const cm = getClassMap()
  const state = useCountdown(() => props.target)
  return (
    <>
      {(() => {
        const expired = state.expired() ? nodeOf(props.expired) : undefined
        if (expired !== undefined) return expired
        const current = {
          days: state.days(),
          hours: state.hours(),
          minutes: state.minutes(),
          seconds: state.seconds(),
          msRemaining: state.msRemaining(),
          expired: state.expired(),
        }
        if (props.render) return <span class={props.className}>{props.render(current)}</span>
        return (
          <span class={cm.cn(props.className)}>
            {formatDisplay(
              props.format ?? 'compact',
              current.days,
              current.hours,
              current.minutes,
              current.seconds,
            )}
          </span>
        )
      })()}
    </>
  )
}
