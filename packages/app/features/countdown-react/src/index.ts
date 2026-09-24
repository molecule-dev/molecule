/**
 * Time-remaining countdown.
 *
 * Exports:
 * - `useCountdown(target, tickMs?)` — live state hook.
 * - `<Countdown>` — display component with compact/long/colon formats and custom render.
 *
 * @example
 * ```tsx
 * import { Countdown, useCountdown } from '@molecule/app-countdown-react'
 *
 * const SALE_ENDS_AT = '2030-01-01T00:00:00Z' // fixed target — never `Date.now() + x` inside render
 *
 * export function SaleBanner() {
 *   const { expired } = useCountdown(SALE_ENDS_AT)
 *   // Shows "03:04:12:05" (days:hours:minutes:seconds); `expired={null}` renders nothing once past.
 *   return (
 *     <div data-expired={expired}>
 *       <Countdown target={SALE_ENDS_AT} format="colon" expired={null} />
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * - `target` is a Date, ISO string or epoch MILLISECONDS (not seconds). Keep it stable: a
 *   `Date.now() + 3_600_000` computed during render moves the target on every re-render, so the
 *   timer never counts down — compute it once (constant, state, or `useMemo`).
 * - The built-in `'compact'` (default, `3d 4h 12m 5s`) and `'long'` (`3 days 4 hours …`) formats
 *   hardcode English unit labels and pluralization — there is no locale bond. `'colon'`
 *   (`03:04:12:05`) is language-neutral; for localized units use the `render` prop with the
 *   `useCountdown` state and compose translated units via `t()`.
 * - `expired` only swaps the rendering once the target passes (`undefined` keeps showing
 *   zeros; `null` renders nothing). Schedule side effects (redirects, refetches) from
 *   `useCountdown().expired` in an effect, not from the component.
 * - `useCountdown(target, tickMs)` ticks every `tickMs` MILLISECONDS (default 1000; `0`
 *   disables the interval). `<Countdown>` always ticks every second.
 * - `getClassMap()` throws unless `setClassMap(classMap)` from `@molecule/app-ui` ran at
 *   startup. No `<I18nProvider>` is required.
 *
 * @module
 */

export * from './Countdown.js'
export * from './useCountdown.js'
