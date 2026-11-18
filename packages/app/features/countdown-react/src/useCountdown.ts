import { useMemo, useSyncExternalStore } from 'react'

/** Snapshot of time remaining until a target date. */
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
 * Computes the countdown state at a given instant.
 *
 * @param now - The epoch-ms time the clock last read.
 * @param target - The epoch-ms target.
 * @returns The time remaining from `now` to `target`.
 */
function computeAt(now: number, target: number): CountdownState {
  const ms = target - now
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

/** One target's countdown as an external store for `useSyncExternalStore`. */
interface CountdownStore {
  /** Starts the interval (none when `tickMs` is `0` or less); returns its stop. */
  subscribe: (onTick: () => void) => () => void
  /** The countdown: computed from the clock on the first read, then again after each tick. */
  read: () => CountdownState
}

/**
 * Creates the countdown store for one target and tick interval.
 *
 * @param target - The epoch-ms target.
 * @param tickMs - Refresh interval; `0` or less never ticks.
 * @returns The store.
 */
function createCountdownStore(target: number, tickMs: number): CountdownStore {
  let ticks = 0
  let snapshot: { ticks: number; state: CountdownState } | null = null
  return {
    subscribe(onTick) {
      if (tickMs <= 0) return () => {}
      const id = setInterval(() => {
        ticks += 1
        onTick()
      }, tickMs)
      return () => clearInterval(id)
    },
    read() {
      if (snapshot === null || snapshot.ticks !== ticks) {
        snapshot = { ticks, state: computeAt(Date.now(), target) }
      }
      return snapshot.state
    },
  }
}

/**
 * Live-updating countdown to a target date.
 *
 * The clock is read as an external store: a new `target` or `tickMs` reads it
 * afresh and restarts the interval, as the other frameworks' countdowns do, and
 * each tick reads it again. A `tickMs` of `0` or less never ticks, so the
 * countdown then moves only when `target` changes. The returned object keeps its
 * identity between ticks.
 *
 * @param target - Date / ISO string / epoch ms.
 * @param tickMs - Refresh interval. Defaults to 1000.
 * @returns The time remaining.
 */
export function useCountdown(
  target: Date | string | number,
  tickMs: number = 1_000,
): CountdownState {
  const ts =
    typeof target === 'number' ? target : target instanceof Date ? +target : +new Date(target)
  const store = useMemo(() => createCountdownStore(ts, tickMs), [ts, tickMs])
  return useSyncExternalStore(store.subscribe, store.read, store.read)
}
