/**
 * TickerRow component (React parity).
 *
 * @module
 */

import { type AfterViewInit, Component, type ElementRef, signal, ViewChild } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

const POSITIVE_COLOR = '#22c55e'
const NEGATIVE_COLOR = '#ef4444'

/**
 * Whether a projected node renders anything (an element, or text with
 * content beyond whitespace).
 *
 * @param node - The projected node.
 * @returns True when it renders.
 */
const hasRenderable = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE ||
  (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0)

/**
 * Whether an element carries renderable content (a projected slot landed, or
 * its text input rendered).
 *
 * @param el - The element.
 * @returns True when its children render anything.
 */
const hasRenderableContent = (el: HTMLElement): boolean =>
  Array.from(el.childNodes).some(hasRenderable)

/**
 * TickerRow component.
 *
 * Financial ticker row — symbol + price + change% + optional icon, sparkline
 * and meta. The host IS the root `<div>` (`div[mol-ticker-row]`), matching
 * React's root exactly. `onClick` is an input the host's native click calls
 * (React's row is a clickable div WITHOUT button semantics — wrap it in your
 * own button/link where keyboard access matters). The change color is applied
 * inline through a style binding (the CSSOM, as react-dom does); the layout
 * and type classes come from the ClassMap bond. Same props, same DOM as
 * `@molecule/app-ticker-row-react`'s `TickerRow`. Node-valued `symbol`, `name`,
 * `icon`, `price`, `sparkline` and `meta` content is projected
 * (`[slot=<name>]`); a string or number input renders as text.
 */
@Component({
  selector: 'div[mol-ticker-row]',
  standalone: true,
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
    '(click)': 'callClick($event)',
  },
  // prettier-ignore
  template: `@if (showIcon) {<div #iconDiv [class]="iconClasses()">@if (hasIcon) {<ng-container>{{ icon }}</ng-container>}<ng-content select="[slot=icon]" /></div>}<div [class]="symbolClasses()"><span [class]="symbolTextClasses()">@if (hasSymbol) {<ng-container>{{ symbol }}</ng-container>}<ng-content select="[slot=symbol]" /></span>@if (showName) {<span #nameSpan [class]="nameClasses()">@if (hasName) {<ng-container>{{ name }}</ng-container>}<ng-content select="[slot=name]" /></span>}</div>@if (showSparkline) {<div #sparkDiv [class]="sparkClasses()">@if (hasSparkline) {<ng-container>{{ sparkline }}</ng-container>}<ng-content select="[slot=sparkline]" /></div>}<div [class]="priceClasses()"><span [class]="priceTextClasses()">@if (hasPrice) {<ng-container>{{ price }}</ng-container>}<ng-content select="[slot=price]" /></span>@if (showChange) {<span [class]="changeTextClasses()" [style.color]="styleColor()">{{ arrow() + ' ' }}@if (hasChangeDisplay) {<ng-container>{{ changeDisplay }}</ng-container>}@else {<ng-container>{{ formattedChange() }}</ng-container>}</span>}</div>@if (showMeta) {<div #metaDiv [class]="metaClasses()">@if (hasMeta) {<ng-container>{{ meta }}</ng-container>}<ng-content select="[slot=meta]" /></div>}`,
})
export class TickerRow implements AfterViewInit {
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
  /** Optional volume / market-cap display: text, or `[slot=meta]` content. */
  meta?: unknown
  /** Extra classes. */
  className?: string
  /** Click handler (React's `onClick`); the host's native click calls it. */
  onClick?: (event: MouseEvent) => void

  /** The optional icon wrapper div (projected content lands here; read once). */
  @ViewChild('iconDiv') private iconDiv?: ElementRef<HTMLDivElement>
  /** The optional name span (projected content lands here; read once). */
  @ViewChild('nameSpan') private nameSpan?: ElementRef<HTMLSpanElement>
  /** The optional sparkline wrapper div (projected content lands here; read once). */
  @ViewChild('sparkDiv') private sparkDiv?: ElementRef<HTMLDivElement>
  /** The optional meta wrapper div (projected content lands here; read once). */
  @ViewChild('metaDiv') private metaDiv?: ElementRef<HTMLDivElement>

  /**
   * Whether a `[slot=icon]` projection landed (true until the first view
   * proves otherwise).
   */
  private readonly iconProjected = signal(true)
  /**
   * Whether a `[slot=name]` projection landed (true until the first view
   * proves otherwise).
   */
  private readonly nameProjected = signal(true)
  /**
   * Whether a `[slot=sparkline]` projection landed (true until the first view
   * proves otherwise).
   */
  private readonly sparkProjected = signal(true)
  /**
   * Whether a `[slot=meta]` projection landed (true until the first view
   * proves otherwise).
   */
  private readonly metaProjected = signal(true)

  /**
   * Reads the optional wrappers' first render: when neither a text input nor
   * projected content landed, React would not render the wrapper at all, so
   * the optimistic render is withdrawn. View queries resolve only at view
   * init, and a projected slot's content is in place by then.
   */
  ngAfterViewInit(): void {
    const icon = this.iconDiv?.nativeElement
    if (icon && !this.hasIcon && !hasRenderableContent(icon)) this.iconProjected.set(false)
    const name = this.nameSpan?.nativeElement
    if (name && !this.hasName && !hasRenderableContent(name)) this.nameProjected.set(false)
    const spark = this.sparkDiv?.nativeElement
    if (spark && !this.hasSparkline && !hasRenderableContent(spark)) this.sparkProjected.set(false)
    const meta = this.metaDiv?.nativeElement
    if (meta && !this.hasMeta && !hasRenderableContent(meta)) this.metaProjected.set(false)
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the root class list (React's
   * `cm.flex({align:'center',gap:'sm'})`, `cm.sp('py',2)`, `cm.cursorPointer`
   * when clickable, and `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().sp('py', 2),
      this.onClick != null ? this.cm().cursorPointer : undefined,
      this.className,
    )
  }

  /**
   * Forwards the host's native click to the `onClick` handler (React's
   * `onClick={onClick}` on the row div) with the native event.
   *
   * @param event - The native click event.
   */
  callClick(event: MouseEvent): void {
    this.onClick?.(event)
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
   * `cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  changeTextClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * The meta div's class (React's `cm.cn(cm.textSize('xs'), cm.shrink0)`).
   * @returns The class string.
   */
  metaClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().shrink0)
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
   * The change span's inline color of the current direction (undefined for a
   * flat direction — React then writes no style).
   * @returns The hex color, or null to clear the property.
   */
  styleColor(): string | null {
    return this.positive ? POSITIVE_COLOR : this.negative ? NEGATIVE_COLOR : null
  }

  /**
   * The direction arrow.
   * @returns `'▲'`, `'▼'` or `'–'`.
   */
  arrow(): string {
    return this.positive ? '▲' : this.negative ? '▼' : '–'
  }

  /**
   * The formatted percentage fallback (React's
   * `` `${changePct?.toFixed(2)}%` ``).
   * @returns The formatted change.
   */
  formattedChange(): string {
    return `${this.changePct?.toFixed(2)}%`
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
   * Whether the name span renders: React's truthy `name`, or projected
   * `[slot=name]` content. A plain getter, so every change detection pass
   * follows the inputs (a computed would cache on its signal dependency alone
   * and miss a later text input).
   * @returns True when the name span shows.
   */
  get showName(): boolean {
    return this.hasName || this.nameProjected()
  }

  /**
   * Whether a text icon input is present (React's `icon && …` truthiness).
   * @returns True when the icon input renders as text.
   */
  get hasIcon(): boolean {
    return this.icon !== undefined && this.icon !== null && this.icon !== ''
  }

  /**
   * Whether the icon wrapper renders: React's truthy `icon`, or projected
   * `[slot=icon]` content.
   * @returns True when the icon wrapper shows.
   */
  get showIcon(): boolean {
    return this.hasIcon || this.iconProjected()
  }

  /**
   * Whether a text sparkline input is present (React's truthiness).
   * @returns True when the sparkline input renders as text.
   */
  get hasSparkline(): boolean {
    return this.sparkline !== undefined && this.sparkline !== null && this.sparkline !== ''
  }

  /**
   * Whether the sparkline wrapper renders: React's truthy `sparkline`, or
   * projected `[slot=sparkline]` content.
   * @returns True when the sparkline wrapper shows.
   */
  get showSparkline(): boolean {
    return this.hasSparkline || this.sparkProjected()
  }

  /**
   * Whether a text meta input is present (React's `meta && …` truthiness).
   * @returns True when the meta input renders as text.
   */
  get hasMeta(): boolean {
    return this.meta !== undefined && this.meta !== null && this.meta !== ''
  }

  /**
   * Whether the meta div renders: React's truthy `meta`, or projected
   * `[slot=meta]` content.
   * @returns True when the meta div shows.
   */
  get showMeta(): boolean {
    return this.hasMeta || this.metaProjected()
  }
}
