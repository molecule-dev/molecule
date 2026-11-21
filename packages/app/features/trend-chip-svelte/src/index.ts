/**
 * Svelte standalone trend delta chip (▲ 12%) — the Svelte counterpart of
 * `@molecule/app-trend-chip-react`, with the same props and the same DOM for
 * the same input.
 *
 * Exports `TrendChip`: an inline `▲ 12%` chip for tables, headers and cards,
 * styled entirely through the ClassMap bond.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { TrendChip } from '@molecule/app-trend-chip-svelte'
 * </script>
 *
 * <table>
 *   <tr>
 *     <td><TrendChip delta={12} /></td>
 *     <td><TrendChip delta={-4.5} suffix="%" variant="pill" /></td>
 *   </tr>
 * </table>
 * ```
 *
 * @remarks
 * Colors come from the ClassMap bond's semantic tones and follow the app
 * theme: `subtle` text is `cm.textTone` of success (up), error (down) or
 * secondary (flat); the `pill` preset fills with `cm.bgTone` of the same tone
 * and reads `cm.textOnTone` (the theme's inverse text). Up is always green /
 * down always red: there is no inversion knob. The number renders as
 * `Math.abs(delta)` + `suffix`
 * ('%' by default) — the sign only picks the arrow; `direction` overrides
 * sign-detection. Props (documented on the exported `TrendChipProps`
 * interface): delta, direction ('up' | 'down' | 'flat'), suffix, prefix,
 * variant ('subtle' | 'pill'), ariaLabel, className. No data-mol-id prop.
 * A string or number `prefix` participates in the default aria label; a
 * snippet `prefix` renders inline — pass `ariaLabel` with a snippet prefix,
 * since the default label of a non-string prefix is not meaningful.
 * Without i18n: the chip carries no user-visible text of its own.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
