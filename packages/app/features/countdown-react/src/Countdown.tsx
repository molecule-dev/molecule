import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { useCountdown } from './useCountdown.js'

interface CountdownProps {
  /** Target date / ISO string / epoch ms. */
  target: Date | string | number
  /** Display format. Defaults to `'compact'`. */
  format?: 'compact' | 'long' | 'colon'
  /** Renderer override — receives the live state for full control. */
  render?: (state: ReturnType<typeof useCountdown>) => ReactNode
  /** Optional rendered when the timer expires. */
  expired?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Live countdown display with three default formats:
 * - `'compact'` — `3d 4h 12m 5s` (skips zero leading units)
 * - `'long'` — `3 days 4 hours 12 minutes 5 seconds`
 * - `'colon'` — `03:04:12:05`
 *
 * Pass `render` for full control over markup.
 * @param root0
 * @param root0.target
 * @param root0.format
 * @param root0.render
 * @param root0.expired
 * @param root0.className
 */
export function Countdown({
  target,
  format = 'compact',
  render,
  expired,
  className,
}: CountdownProps) {
  const cm = getClassMap()
  const state = useCountdown(target)
  if (state.expired && expired !== undefined) return <>{expired}</>
  if (render) return <span className={className}>{render(state)}</span>
  const { days, hours, minutes, seconds } = state
  let display: string
  if (format === 'colon') {
    const pad = (n: number) => String(n).padStart(2, '0')
    display = `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  } else if (format === 'long') {
    const parts: string[] = []
    if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`)
    if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`)
    if (minutes) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`)
    parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`)
    display = parts.join(' ')
  } else {
    const parts: string[] = []
    if (days) parts.push(`${days}d`)
    if (hours || days) parts.push(`${hours}h`)
    if (minutes || hours || days) parts.push(`${minutes}m`)
    parts.push(`${seconds}s`)
    display = parts.join(' ')
  }
  return <span className={cm.cn(className)}>{display}</span>
}
