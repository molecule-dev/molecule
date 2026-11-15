/**
 * Svelte time-remaining countdown — the counterpart of
 * `@molecule/app-countdown-react`: the same exports, the same props (React
 * names) and the same DOM for the same input.
 *
 * Exports:
 * - `useCountdown(target, tickMs?)` — live state hook (a readable store per value).
 * - `<Countdown>` — display component with compact/long/colon formats and custom render.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { Countdown } from '@molecule/app-countdown-svelte'
 * </script>
 *
 * <!-- Compact default: "3d 4h 12m 5s" -->
 * <Countdown target="2026-12-31T23:59:59Z">
 *   {#snippet expired()}<span>Sale ended!</span>{/snippet}
 * </Countdown>
 *
 * <!-- Colon format: "03:04:12:05" -->
 * <Countdown target={new Date('2026-12-31')} format="colon" />
 *
 * <!-- Long format: "3 days 4 hours 12 minutes 5 seconds" -->
 * <Countdown target={Date.now() + 3_600_000} format="long" />
 * ```
 *
 * @remarks
 * The built-in `'compact'` and `'long'` formats hardcode English unit labels
 * and pluralization ("3d 4h", "3 days 4 hours") — there is no locale bond.
 * For localized apps use the `render` snippet with the live state and compose
 * translated units via `t()` (or `Intl.RelativeTimeFormat`). `expired` only
 * swaps the rendering once the target passes — schedule side effects
 * (redirects, refetches) from `useCountdown().expired` in an effect, not from
 * the component.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
export * from './useCountdown.js'
