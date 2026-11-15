/**
 * Vue composable porting React's `useCountdown`: a live-updating snapshot of the
 * time remaining until a target date.
 *
 * @module
 */

import { computed, type ComputedRef, type MaybeRefOrGetter, ref, toValue, watch } from 'vue'

import { computeState, targetMs } from './state.js'

/**
 * The interval a tick argument stands for: an omitted argument takes React's
 * default of one second, and any value at or below zero disables the timer.
 *
 * @param tickMs - The tick argument's current value.
 * @returns The refresh interval in milliseconds.
 */
const tickOf = (tickMs: number | undefined): number => (tickMs === undefined ? 1_000 : tickMs)

/**
 * Live-updating countdown to a target date, React's `useCountdown` in Vue's
 * idiom: the target and interval may each be a plain value or a reactive source
 * (a ref or getter), and the composable follows a changed source on the same
 * mount — a component re-rendering with a new `target` prop behaves as React's
 * hook does.
 *
 * @param target - Date / ISO string / epoch ms.
 * @param tickMs - Refresh interval. Defaults to `1000`; `0` or less disables it.
 * @returns The live countdown fields — one computed read-only ref per value.
 * @example
 * ```vue
 * <script setup>
 * import { useCountdown } from '@molecule/app-countdown-vue'
 *
 * const { days, hours, minutes, seconds, expired } = useCountdown('2026-12-31T23:59:59Z')
 * </script>
 *
 * <template>
 *   <p v-if="expired">Sale ended!</p>
 *   <p v-else>{{ days }}d {{ hours }}h {{ minutes }}m {{ seconds }}s</p>
 * </template>
 * ```
 */
export function useCountdown(
  target: MaybeRefOrGetter<Date | string | number>,
  tickMs: MaybeRefOrGetter<number | undefined> = 1_000,
): {
  /** Days remaining. */
  days: ComputedRef<number>
  /** Hours (0-23) within current day. */
  hours: ComputedRef<number>
  /** Minutes (0-59) within current hour. */
  minutes: ComputedRef<number>
  /** Seconds (0-59) within current minute. */
  seconds: ComputedRef<number>
  /** Total milliseconds remaining (negative if past). */
  msRemaining: ComputedRef<number>
  /** True once the target is in the past. */
  expired: ComputedRef<boolean>
} {
  const state = ref(computeState(targetMs(toValue(target)), Date.now()))
  watch(
    () => [targetMs(toValue(target)), tickOf(toValue(tickMs))] as const,
    ([ts, tick]) => {
      state.value = computeState(ts, Date.now())
      if (tick <= 0) return
      const id = setInterval(() => {
        state.value = computeState(ts, Date.now())
      }, tick)
      return () => clearInterval(id)
    },
    { immediate: true },
  )
  return {
    days: computed(() => state.value.days),
    hours: computed(() => state.value.hours),
    minutes: computed(() => state.value.minutes),
    seconds: computed(() => state.value.seconds),
    msRemaining: computed(() => state.value.msRemaining),
    expired: computed(() => state.value.expired),
  }
}
