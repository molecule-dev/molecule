/**
 * Solid standalone trend delta chip (▲ 12%) — the Solid counterpart of
 * `@molecule/app-trend-chip-react`, with the same props and the same DOM for
 * the same input.
 *
 * Exports `TrendChip`: an inline `▲ 12%` chip for tables, headers and cards,
 * styled by the ClassMap bond with the trend color applied inline.
 *
 * @example
 * ```tsx
 * import { TrendChip } from '@molecule/app-trend-chip-solid'
 *
 * export function Row() {
 *   return (
 *     <tr>
 *       <td>
 *         <TrendChip delta={12} />
 *       </td>
 *       <td>
 *         <TrendChip delta={-4.5} suffix="%" variant="pill" />
 *       </td>
 *     </tr>
 *   )
 * }
 * ```
 *
 * @remarks
 * Colors are hardcoded hex applied inline (`#22c55e` up, `#ef4444` down,
 * `#94a3b8` flat) — they ignore the app theme and ClassMap; `pill` renders
 * white text on that background. Up is always green / down always red: there
 * is no inversion knob. The number renders as `Math.abs(delta)` + `suffix`
 * ('%' by default) — the sign only picks the arrow; `direction` overrides
 * sign-detection. Props (documented on the exported `TrendChipProps`
 * interface): delta, direction ('up' | 'down' | 'flat'), suffix, prefix,
 * variant ('subtle' | 'pill'), ariaLabel, className. No data-mol-id prop.
 * A string `prefix` participates in the default aria label; a node `prefix`
 * renders inline — pass `ariaLabel` with a node prefix, since the default
 * label of a non-string prefix is not meaningful. Without i18n: the chip
 * carries no user-visible text of its own.
 *
 * @module
 */

export * from './TrendChip.jsx'
export * from './types.js'
