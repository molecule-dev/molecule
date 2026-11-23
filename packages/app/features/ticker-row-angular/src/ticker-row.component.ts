/**
 * TickerRow component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  useLocale,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Next value of the module-wide row-id counter.
 *
 * React derives the open button's naming id from `useId()`, which numbers ids
 * from one process-wide counter (`_r_<base32>_`). The id appears in `id` and
 * `aria-labelledby`, which the conformance normalizer renumbers in order of
 * appearance, so the port generates ids from the same kind of counter —
 * unique per instance, exactly React's format.
 */
let nextNameId = 0

/**
 * A fresh row id, in React `useId()`'s `_r_<base32>_` shape.
 *
 * @returns The id this instance's open button is named by.
 */
const nameId = (): string => `_r_${(nextNameId++).toString(32)}_`

/**
 * TickerRow component.
 *
 * Financial ticker row — symbol + price + change% + optional icon, sparkline
 * and meta. The host IS the root `<div>` (`div[mol-ticker-row]`), matching
 * React's root exactly. While `onClick` is set the whole row is clickable
 * through a transparent native button laid over it — the row's open action,
 * named by the symbol — and the row's inner control (the `meta` slot, which
 * may hold a control) is raised into a positioned wrapper so it paints above
 * the open button and keeps its own clicks. A native button turns Enter and
 * Space into the same click itself. The direction color comes from the theme
 * success/error text tokens (`cm.textSuccess` / `cm.textError`); the default
 * percentage text comes from `Intl.NumberFormat` in the app's active locale.
 * The layout and type classes come from the ClassMap bond. Same props, same
 * DOM as `@molecule/app-ticker-row-react`'s `TickerRow`. Node-valued
 * `symbol`, `name`, `icon`, `price`, `sparkline` and `meta` content is
 * projected (`[slot=<name>]`); a string or number input renders as text.
 */
@Component({
  selector: 'div[mol-ticker-row]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: [
    'symbol',
    'name',
    'icon',
    'price',
    'changePct',
    'changeDisplay',
    'sparkline',
    'meta',
    'className',
    'onClick',
  ],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `@if (onClick) {<button type="button" [attr.aria-labelledby]="instanceNameId" data-mol-id="ticker-row-open" (click)="handleClick()" [class]="openButtonClasses()" [style.background]="'transparent'" [style.border]="'none'" [style.padding]="'0px'"></button>}<div #iconDiv [class]="iconClasses()">@if (hasIcon) {<ng-container>{{ icon }}</ng-container>}<ng-content select="[slot=icon]" /></div><div [class]="symbolClasses()"><span [attr.id]="symbolId()" [class]="symbolTextClasses()">@if (hasSymbol) {<ng-container>{{ symbol }}</ng-container>}<ng-content select="[slot=symbol]" /></span><span #nameSpan [class]="nameClasses()">@if (hasName) {<ng-container>{{ name }}</ng-container>}<ng-content select="[slot=name]" /></span></div><div #sparkDiv [class]="sparkClasses()">@if (hasSparkline) {<ng-container>{{ sparkline }}</ng-container>}<ng-content select="[slot=sparkline]" /></div><div [class]="priceClasses()"><span [class]="priceTextClasses()">@if (hasPrice) {<ng-container>{{ price }}</ng-container>}<ng-content select="[slot=price]" /></span>@if (showChange) {<span [class]="changeTextClasses()"><span aria-hidden="true">{{ arrow() }}</span><span [class]="srOnlyClasses()">{{ directionLabel() }}</span>{{ ' ' }}@if (hasChangeDisplay) {<ng-container>{{ changeDisplay }}</ng-container>}@else {<ng-container>{{ formattedChange() }}</ng-container>}</span>}</div><div #metaDiv [class]="metaClasses()">@if (hasMeta) {<ng-container>{{ meta }}</ng-container>}<ng-content select="[slot=meta]" /></div>`,
})
export class TickerRow {
  /** Symbol / ticker display ("BTC", "AAPL"): text, or `[slot=symbol]` content. */
  symbol?: unknown
  /** Full name display: text, or `[slot=name]` content. */
  name?: unknown
  /** Optional leading icon / logo: text, or `[slot=icon]` content. */
  icon?: unknown
  /** Current price (formatted): text, or `[slot=price]` content. */
  price?: unknown
  /** Period change percentage — drives direction + color when present. */
  changePct?: number
  /** Period change formatted display (defaults to `changePct` formatted). */
  changeDisplay?: string
  /** Optional sparkline node: text, or `[slot=sparkline]` content. */
  sparkline?: unknown
  /** Optional volume / market-cap display: text, or `[slot=meta]` content. May hold a control; it keeps its own clicks. */
  meta?: unknown
  /** Extra classes. */
  className?: string
  /**
   * Click handler (React's `onClick`). While it is set the whole row is
   * clickable through the transparent open button laid over it; the handler
   * runs with no arguments, as React's does.
   */
  onClick?: () => void

  /** This instance's name id (the open button's `aria-labelledby`). */
  private readonly instanceNameId = nameId()

  /** The icon wrapper div (its text input or projected slot decides its presence). */
  @ViewChild('iconDiv', { static: true }) private iconDiv?: ElementRef<HTMLDivElement>
  /** The name span (its text input or projected slot decides its presence). */
  @ViewChild('nameSpan', { static: true }) private nameSpan?: ElementRef<HTMLSpanElement>
  /** The sparkline wrapper div (its text input or projected slot decides its presence). */
  @ViewChild('sparkDiv', { static: true }) private sparkDiv?: ElementRef<HTMLDivElement>
  /** The meta wrapper div (its text input or projected slot decides its presence). */
  @ViewChild('metaDiv', { static: true }) private metaDiv?: ElementRef<HTMLDivElement>

  /**
   * Keeps each optional wrapper on the page only while it renders a text input
   * or projected `[slot=<name>]` content, re-decided whenever either changes
   * (a slot taken away and given back included). React renders no wrapper when
   * its prop is falsy.
   */
  constructor() {
    usePlacement((hasContent) => {
      const icon = this.iconDiv?.nativeElement
      setElementPresent(icon, this.hasIcon || (icon ? hasContent(icon) : false))
      const name = this.nameSpan?.nativeElement
      setElementPresent(name, this.hasName || (name ? hasContent(name) : false))
      const spark = this.sparkDiv?.nativeElement
      setElementPresent(spark, this.hasSparkline || (spark ? hasContent(spark) : false))
      const meta = this.metaDiv?.nativeElement
      setElementPresent(meta, this.hasMeta || (meta ? hasContent(meta) : false))
    })
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The reactive translation handle (a locale switch re-renders the
   * direction words), read in the injection context.
   */
  private readonly i18n = useTranslation()

  /** The app's active locale (React's `useLocale()`), for number formatting. */
  private readonly locale = useLocale()

  /**
   * Computes the root class list (React's
   * `cm.flex({align:'center',gap:'sm'})`, `cm.sp('py',2)`, plus
   * `cm.position('relative')` — the open button's positioning context — and
   * `cm.cursorPointer` while clickable, and `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().sp('py', 2),
      this.onClick != null ? this.cm().position('relative') : undefined,
      this.onClick != null ? this.cm().cursorPointer : undefined,
      this.className,
    )
  }

  /**
   * The open button's class (React's
   * `cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)`).
   * @returns The class string.
   */
  openButtonClasses(): string {
    return this.cm().cn(this.cm().position('absolute'), this.cm().inset0, this.cm().cursorPointer)
  }

  /**
   * The screen-reader-only direction span's class (`cm.cn(cm.srOnly)`).
   * @returns The class string.
   */
  srOnlyClasses(): string {
    return this.cm().cn(this.cm().srOnly)
  }

  /**
   * The symbol span's id (the open button's `aria-labelledby`), while
   * `onClick` is set.
   * @returns The id, or null (React renders no id without `onClick`).
   */
  symbolId(): string | null {
    return this.onClick ? this.instanceNameId : null
  }

  /**
   * Runs the open button's action, as React's `onClick` does (no arguments;
   * a native button turns Enter and Space into this click itself).
   */
  handleClick(): void {
    this.onClick?.()
  }

  /**
   * The symbol span's class list (React's
   * `cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))`).
   * @returns The class string.
   */
  symbolTextClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('bold'))
  }

  /**
   * The symbol/name stack's class (React's `cm.cn(cm.flex1, cm.stack(0))`).
   * @returns The class string.
   */
  symbolClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(0))
  }

  /**
   * The icon wrapper's class.
   * @returns The class string.
   */
  iconClasses(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * The name span's class.
   * @returns The class string.
   */
  nameClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'))
  }

  /**
   * The sparkline wrapper's class.
   * @returns The class string.
   */
  sparkClasses(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * The price block's class (React's `cm.cn(cm.textCenter, cm.stack(0))`).
   * @returns The class string.
   */
  priceClasses(): string {
    return this.cm().cn(this.cm().textCenter, this.cm().stack(0))
  }

  /**
   * The price span's class list (React's
   * `cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  priceTextClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * The change span's class list (React's
   * `cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), colorClass)` — the
   * theme's success/error text token of the current direction).
   * @returns The class string.
   */
  changeTextClasses(): string {
    return this.cm().cn(
      this.cm().textSize('xs'),
      this.cm().fontWeight('semibold'),
      this.colorClass(),
    )
  }

  /**
   * The change span's theme text token of the current direction (undefined
   * for a flat direction — React then applies none).
   * @returns `cm.textSuccess`, `cm.textError`, or undefined.
   */
  colorClass(): string | undefined {
    return this.positive ? this.cm().textSuccess : this.negative ? this.cm().textError : undefined
  }

  /**
   * The meta div's class (React's `cm.cn(cm.textSize('xs'), cm.shrink0)`,
   * plus `cm.position('relative')` while `onClick` is set — the wrapper paints
   * above the open button and keeps the slot's clicks).
   * @returns The class string.
   */
  metaClasses(): string {
    return this.cm().cn(
      this.cm().textSize('xs'),
      this.cm().shrink0,
      this.onClick ? this.cm().position('relative') : undefined,
    )
  }

  /**
   * Whether a changePct input is present.
   * @returns True when `changePct` is set.
   */
  get hasChangePct(): boolean {
    return this.changePct !== undefined
  }

  /**
   * Whether a changeDisplay text input renders (React's `??` fallback: a
   * defined display wins over the formatted percentage).
   * @returns True when the change text comes from `changeDisplay`.
   */
  get hasChangeDisplay(): boolean {
    return this.changeDisplay !== undefined && this.changeDisplay !== null
  }

  /**
   * Whether the change span renders (React's
   * `changeDisplay !== undefined || changePct !== undefined`).
   * @returns True when the change shows.
   */
  get showChange(): boolean {
    return this.hasChangeDisplay || this.hasChangePct
  }

  /**
   * Whether the direction is positive (React's `changePct > 0`).
   * @returns True for a positive `changePct`.
   */
  get positive(): boolean {
    return this.changePct !== undefined && this.changePct > 0
  }

  /**
   * Whether the direction is negative (React's `changePct < 0`).
   * @returns True for a negative `changePct`.
   */
  get negative(): boolean {
    return this.changePct !== undefined && this.changePct < 0
  }

  /**
   * The direction arrow.
   * @returns `'▲'`, `'▼'` or `'–'`.
   */
  arrow(): string {
    return this.positive ? '▲' : this.negative ? '▼' : '–'
  }

  /**
   * The change direction in words for screen readers (React's
   * `t('tickerRow.change.up' | 'down' | 'flat')`).
   * @returns The translated direction.
   */
  directionLabel(): string {
    return this.positive
      ? this.i18n.t('tickerRow.change.up', {}, { defaultValue: 'Up' })
      : this.negative
        ? this.i18n.t('tickerRow.change.down', {}, { defaultValue: 'Down' })
        : this.i18n.t('tickerRow.change.flat', {}, { defaultValue: 'Unchanged' })
  }

  /**
   * The formatted percentage fallback (React's
   * `Intl.NumberFormat(locale, { style: 'percent', … }).format(changePct / 100)`),
   * in the app's active locale.
   * @returns The formatted change.
   */
  formattedChange(): string {
    return new Intl.NumberFormat(this.locale(), {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.changePct! / 100)
  }

  /**
   * Whether a text symbol input is present.
   * @returns True when the symbol input renders as text.
   */
  get hasSymbol(): boolean {
    return this.symbol !== undefined && this.symbol !== null
  }

  /**
   * Whether a text price input is present.
   * @returns True when the price input renders as text.
   */
  get hasPrice(): boolean {
    return this.price !== undefined && this.price !== null
  }

  /**
   * Whether a text name input is present (React's `name && …` truthiness).
   * @returns True when the name input renders as text.
   */
  get hasName(): boolean {
    return this.name !== undefined && this.name !== null && this.name !== ''
  }

  /**
   * Whether a text icon input is present (React's `icon && …` truthiness).
   * @returns True when the icon input renders as text.
   */
  get hasIcon(): boolean {
    return this.icon !== undefined && this.icon !== null && this.icon !== ''
  }

  /**
   * Whether a text sparkline input is present (React's truthiness).
   * @returns True when the sparkline input renders as text.
   */
  get hasSparkline(): boolean {
    return this.sparkline !== undefined && this.sparkline !== null && this.sparkline !== ''
  }

  /**
   * Whether a text meta input is present (React's `meta && …` truthiness).
   * @returns True when the meta input renders as text.
   */
  get hasMeta(): boolean {
    return this.meta !== undefined && this.meta !== null && this.meta !== ''
  }
}
