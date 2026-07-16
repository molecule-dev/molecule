/**
 * Standalone trend delta chip (▲ 12%).
 *
 * Exports `<TrendChip>`.
 *
 * @example
 * ```tsx
 * import { TrendChip } from '@molecule/app-trend-chip-react'
 *
 * // Subtle inline (default)
 * <TrendChip delta={12} />
 *
 * // Colored pill, negative delta
 * <TrendChip delta={-4.5} suffix="%" variant="pill" />
 * ```
 *
 * @remarks
 * Colors are hardcoded hex applied inline (`#22c55e` up, `#ef4444` down,
 * `#94a3b8` flat) — they ignore the app theme and ClassMap; `pill` renders
 * white text on that background. Up is always green / down always red:
 * there is no inversion knob for metrics where a drop is good (costs,
 * churn). The number renders as `Math.abs(delta)` + `suffix` ('%' by
 * default) — the sign only picks the arrow; `direction` overrides
 * sign-detection. Props (documented on the exported `TrendChipProps`
 * interface): delta, direction ('up' | 'down' | 'flat'), suffix, prefix,
 * variant ('subtle' | 'pill'), ariaLabel, className. No data-mol-id prop.
 *
 * @module
 */

export * from './TrendChip.js'
