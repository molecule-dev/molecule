/**
 * Angular time-remaining countdown — the counterpart of
 * `@molecule/app-countdown-react`: the same exports, the same props (React
 * names) and the same DOM for the same input.
 *
 * Exports:
 * - `useCountdown(target, tickMs?)` — live state function (a signal per value).
 * - `<Countdown>` — display component with compact/long/colon formats and a
 *   custom render template.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { Countdown } from '@molecule/app-countdown-angular'
 *
 * @Component({
 *   selector: 'app-sale',
 *   standalone: true,
 *   imports: [Countdown],
 *   template: `
 *     <ng-template #ended><span>Sale ended!</span></ng-template>
 *     <mol-countdown [target]="'2026-12-31T23:59:59Z'" [expired]="ended" />
 *   `,
 * })
 * export class Sale {}
 * ```
 *
 * @remarks
 * The built-in `'compact'` and `'long'` formats hardcode English unit labels
 * and pluralization ("3d 4h", "3 days 4 hours") — there is no locale bond.
 * For localized apps pass a `render` `<ng-template>` whose context carries the
 * live state (`$implicit` / `a0`) and compose translated units via `t()` (or
 * `Intl.RelativeTimeFormat`). `expired` only swaps the rendering once the
 * target passes — schedule side effects (redirects, refetches) from
 * `useCountdown().expired()` in an effect, not from the component.
 *
 * @module
 */

export * from './countdown.component.js'
export * from './types.js'
export * from './useCountdown.js'
