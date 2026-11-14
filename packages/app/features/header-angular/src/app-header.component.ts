/**
 * AppHeader component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type ElementRef,
  inject,
  Renderer2,
  signal,
  ViewChild,
} from '@angular/core'

import { I18N_PROVIDER, Link, THEME_PROVIDER } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Flex, ThemeToggle } from '@molecule/app-ui-angular'

/**
 * Whether an ng-content wrapper captured any element or text node.
 *
 * @param el - The wrapper element.
 * @returns True when at least one projected node exists.
 */
const hasNodes = (el: Element): boolean => {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 1) return true
    if (node.nodeType === 3 && (node.textContent ?? '').trim()) return true
  }
  return false
}

/**
 * AppHeader component.
 *
 * Sticky top app-shell header — logo + appName on the left, slotted actions
 * on the right. The host IS the `<header>` (`header[mol-app-header]`),
 * matching React's root exactly. All visual styling routes through ClassMap
 * tokens (`cm.headerBar`, `cm.headerFixed`, `cm.headerInner`, `cm.logoText`)
 * so the bonded styling layer controls the visual treatment.
 *
 * The brand link is the binding's `Link` (`<a molLink>`), react-router's
 * `<Link to>` contract. The three action slots are projected content
 * (`[slot=themeToggle]`, `[slot=extraActions]`, `[slot=userMenu]`); React
 * renders them bare, so each capture span moves its projected nodes to the
 * slot's position and leaves the DOM. When the `themeToggle` slot is empty
 * and the `themeToggle` input is not `null`, the resilient default renders —
 * the UI package's {@link ThemeToggle}, but ONLY when both the theme provider
 * and the i18n provider are provided above the header (probed with
 * `inject(TOKEN, { optional: true })`, which never throws), exactly like
 * React's `DefaultThemeToggle` context probe.
 */
@Component({
  selector: 'header[mol-app-header]',
  standalone: true,
  imports: [Flex, Link, ThemeToggle],
  inputs: [
    'appName',
    'logoSrc',
    'logoSize',
    'brandTo',
    'themeToggle',
    'fixed',
    'className',
    'dataMolId',
  ],
  host: {
    '[class]': 'headerClasses()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  template: `<div [class]="innerClasses()">
    <div mol-flex [align]="'center'" [justify]="'between'" [className]="cm().h('full')">
      <a [molLink]="brandToValue()">
        <div mol-flex [align]="'center'" [gap]="'xs'">
          <img
            alt=""
            [attr.src]="logoSrcValue()"
            [attr.width]="logoSizeValue()"
            [attr.height]="logoSizeValue()"
          />
          <span [class]="logoTextClasses()">{{ appName }}</span>
        </div>
      </a>
      <div mol-flex [align]="'center'" [gap]="'sm'">
        <span #toggleSlot><ng-content select="[slot=themeToggle]"></ng-content></span>
        @if (showDefaultToggle()) {
          <button mol-theme-toggle></button>
        }
        <span #extraSlot><ng-content select="[slot=extraActions]"></ng-content></span>
        <span #menuSlot><ng-content select="[slot=userMenu]"></ng-content></span>
      </div>
    </div>
  </div>`,
})
export class AppHeader implements AfterViewInit {
  /** Brand display name shown next to the logo. */
  appName = ''
  /** Logo image source (defaults to `/logo.svg` at read time). */
  logoSrc?: string
  /** Logo size in pixels (square; defaults to 30 at read time). */
  logoSize?: number
  /** Path the brand link navigates to (defaults to `/` at read time). */
  brandTo?: string
  /** Force-hides the default theme toggle when bound to `null` (React's `themeToggle={null}`). */
  themeToggle?: null
  /** Apply `cm.headerFixed` (defaults to `true` at read time). */
  fixed?: boolean
  /** Extra className on the outer `<header>`. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The themeToggle slot capture span (moved out of the DOM once read). */
  @ViewChild('toggleSlot') toggleSlot?: ElementRef<HTMLSpanElement>
  /** The extraActions slot capture span. */
  @ViewChild('extraSlot') extraSlot?: ElementRef<HTMLSpanElement>
  /** The userMenu slot capture span. */
  @ViewChild('menuSlot') menuSlot?: ElementRef<HTMLSpanElement>

  /** The theme provider above the header, or null — React's `useContext(ThemeContext)` probe. */
  private readonly themeProvider = inject(THEME_PROVIDER, { optional: true })

  /** The i18n provider above the header, or null — React's `useContext(I18nContext)` probe. */
  private readonly i18nProvider = inject(I18N_PROVIDER, { optional: true })

  private readonly renderer = inject(Renderer2)

  /** Each capture span's anchor comment (marks the slot's position in the DOM). */
  private readonly anchors = new Map<HTMLSpanElement, Comment>()

  /** Whether each slot carries projected nodes (drives the default toggle's `@if`). */
  private readonly slots = signal({ toggle: false, extra: false, menu: false })

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the header class list (`cm.headerBar` + optional `cm.headerFixed` + `className`).
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().cn(
      this.cm().headerBar,
      this.isFixed() ? this.cm().headerFixed : '',
      this.className,
    )
  }

  /**
   * The header inner wrapper's class (`cm.headerInner`), through `cn()` so a
   * token that is a function in the bonded map resolves to its string.
   * @returns The class string.
   */
  innerClasses(): string {
    return this.cm().cn(this.cm().headerInner)
  }

  /**
   * The brand text's class (`cm.logoText`), through `cn()` so a token that is
   * a function in the bonded map resolves to its string.
   * @returns The class string.
   */
  logoTextClasses(): string {
    return this.cm().cn(this.cm().logoText)
  }

  /**
   * Whether the header is fixed (React's `fixed` default parameter).
   * @returns False only when the input was bound to `false`.
   */
  isFixed(): boolean {
    return this.fixed ?? true
  }

  /**
   * The logo image source (React's default parameter).
   * @returns The source path.
   */
  logoSrcValue(): string {
    return this.logoSrc ?? '/logo.svg'
  }

  /**
   * The logo pixel size (React's default parameter).
   * @returns The size.
   */
  logoSizeValue(): number {
    return this.logoSize ?? 30
  }

  /**
   * The brand link target (React's default parameter).
   * @returns The path.
   */
  brandToValue(): string {
    return this.brandTo ?? '/'
  }

  /**
   * Whether the resilient default theme toggle renders: the slot is empty,
   * `themeToggle` is not `null`, and BOTH the theme provider and the i18n
   * provider are provided above the header.
   * @returns True when the default toggle shows.
   */
  showDefaultToggle(): boolean {
    return (
      !this.slots().toggle &&
      this.themeToggle !== null &&
      !!this.themeProvider &&
      !!this.i18nProvider
    )
  }

  /**
   * Reads slot presence (view queries resolve only at view init), moves every
   * slot's projected nodes to its position and leaves the capture spans out
   * of the DOM — React renders the slots bare.
   */
  ngAfterViewInit(): void {
    const toggle = this.toggleSlot?.nativeElement
    const extra = this.extraSlot?.nativeElement
    const menu = this.menuSlot?.nativeElement
    // Read presence BEFORE relocating: relocate() moves the projected nodes out.
    const state = {
      toggle: toggle ? hasNodes(toggle) : false,
      extra: extra ? hasNodes(extra) : false,
      menu: menu ? hasNodes(menu) : false,
    }
    for (const span of [toggle, extra, menu]) {
      if (span) this.relocate(span)
    }
    this.slots.set(state)
  }

  /**
   * Moves one slot's projected nodes out of its capture span to the slot's
   * position (marked by an anchor comment) and detaches the empty span —
   * React renders `{slot}` with no wrapper element.
   *
   * @param span - The capture span.
   */
  private relocate(span: HTMLSpanElement): void {
    const parent = span.parentElement
    if (!parent) return
    const existing = this.anchors.get(span)
    const anchor =
      existing && existing.isConnected ? existing : this.createAnchor(parent, span, existing)
    for (const node of Array.from(span.childNodes)) parent.insertBefore(node, anchor)
    if (span.isConnected) parent.removeChild(span)
  }

  /**
   * Creates the anchor comment for a capture span, records it, and inserts it
   * where the span sat (any stale anchor from a previous mount is replaced).
   *
   * @param parent - The span's parent (the anchor's parent).
   * @param span - The capture span.
   * @param stale - A previous anchor that is no longer connected, if any.
   * @returns The connected anchor comment.
   */
  private createAnchor(
    parent: Node,
    span: HTMLSpanElement,
    stale: Comment | null | undefined,
  ): Comment {
    if (stale) this.anchors.delete(span)
    const created = this.renderer.createComment('slot')
    parent.insertBefore(created, span)
    this.anchors.set(span, created)
    return created
  }
}
