import { useEffect, useState } from 'react'

/**
 *
 */
export interface CountdownState {
  /** Days remaining. */
  days: number
  /** Hours (0-23) within current day. */
  hours: number
  /** Minutes (0-59) within current hour. */
  minutes: number
  /** Seconds (0-59) within current minute. */
  seconds: number
  /** Total milliseconds remaining (negative if past). */
  msRemaining: number
  /** True once `target` is in the past. */
  expired: boolean
}

/**
 *
 * @param target
 */
function compute(target: number): CountdownState {
  const ms = target - Date.now()
  const expired = ms <= 0
  const t = Math.max(0, ms)
  return {
    days: Math.floor(t / 86_400_000),
    hours: Math.floor((t % 86_400_000) / 3_600_000),
    minutes: Math.floor((t % 3_600_000) / 60_000),
    seconds: Math.floor((t % 60_000) / 1_000),
    msRemaining: ms,
    expired,
  }
}

/**
 * Live-updating countdown to a target date.
 *
 * @param target - Date / ISO string / epoch ms.
 * @param tickMs - Refresh interval. Defaults to 1000.
 */
export function useCountdown(
  target: Date | string | number,
  tickMs: number = 1_000,
): CountdownState {
  const ts =
    typeof target === 'number' ? target : target instanceof Date ? +target : +new Date(target)
  const [state, setState] = useState(() => compute(ts))
  useEffect(() => {
    setState(compute(ts))
    if (tickMs <= 0) return
    const id = setInterval(() => setState(compute(ts)), tickMs)
    return () => clearInterval(id)
  }, [ts, tickMs])
  return state
}
