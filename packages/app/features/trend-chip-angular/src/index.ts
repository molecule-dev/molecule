/**
 * Angular standalone trend delta chip (▲ 12%) — the counterpart of
 * `@molecule/app-trend-chip-react`, with the same props and the same DOM for
 * the same input.
 *
 * Exports `<TrendChip>`: an inline `▲ 12%` chip for tables, headers and
 * cards, styled by the ClassMap bond with the trend color applied inline.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { TrendChip } from '@molecule/app-trend-chip-angular'
 *
 * @Component({
 *   selector: 'app-row',
 *   standalone: true,
 *   imports: [TrendChip],
 *   template: `
 *     <tr>
 *       <td><span mol-trend-chip [delta]="12" /></td>
 *       <td><span mol-trend-chip [delta]="-4.5" variant="pill" /></td>
 *     </tr>
 *   `,
 * })
 * export class Row {}
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
 * The host element IS the chip's `<span>` (`span[mol-trend-chip]`); a
 * node-valued `prefix` is projected content selected by `[slot=prefix]`,
 * while a string or number `prefix` input renders as text and feeds the
 * default aria label — pass `ariaLabel` with a projected prefix, since the
 * default label of a non-string prefix is not meaningful. Without i18n: the
 * chip carries no user-visible text of its own.
 *
 * @module
 */

export * from './trend-chip.component.js'
export * from './types.js'
