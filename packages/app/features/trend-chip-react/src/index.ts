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
 * Colors come from the ClassMap bond's semantic tones and follow the app
 * theme: `subtle` text is `cm.textTone` of success (up), error (down) or
 * secondary (flat); the `pill` preset fills with `cm.bgTone` of the same
 * tone and reads `cm.textOnTone` (the theme's inverse text). Up is always
 * green / down always red: there is no inversion knob for metrics where a
 * drop is good (costs, churn). The number renders as `Math.abs(delta)` +
 * `suffix` ('%' by default) — the sign only picks the arrow; `direction`
 * overrides sign-detection. Props (documented on the exported
 * `TrendChipProps` interface): delta, direction ('up' | 'down' | 'flat'),
 * suffix, prefix, variant ('subtle' | 'pill'), ariaLabel, className. No
 * data-mol-id prop.
 *
 * @module
 */

export * from './TrendChip.js'
