/**
 * AppHeader component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  afterEveryRender,
  type AfterViewInit,
  Component,
  ElementRef,
  inject,
  Renderer2,
  signal,
  type TemplateRef,
} from '@angular/core'

import { I18N_PROVIDER, Link, THEME_PROVIDER } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { asTemplate, Flex, nodeText, ThemeToggle } from '@molecule/app-ui-angular'

import { NavLinkAttributes } from './nav-link-attributes.directive.js'
import type { AppHeaderNavigation } from './types.js'

/** One navigation entry in declaration order, ready for the template's `@for`. */
interface NavLinkEntry {
  /** The destination path (the key of the link record). */
  readonly to: string
  /** The destination's link props. */
  readonly link: AppHeaderNavigation['links'][string]
}

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
 * `<Link to>` contract. When `navigation` is set, the inner wrapper becomes
 * the navigation landmark (`<nav aria-label>`) holding the brand, the
 * declared links and the action slots — React's `navigation` prop; without it
 * the wrapper stays a plain `<div>` and the header has no landmark. The three
 * action slots are projected content
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
  imports: [Flex, Link, NavLinkAttributes, NgTemplateOutlet, ThemeToggle],
  inputs: [
    'appName',
    'logoSrc',
    'logoSize',
    'brandTo',
    'brandClassName',
    'navigation',
    'themeToggle',
    'fixed',
    'className',
    'dataMolId',
  ],
  host: {
    '[class]': 'headerClasses()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  // prettier-ignore
  template: `@if (navigation; as nav) {
      <nav [class]="innerClasses()" [attr.aria-label]="nav.label">
        <ng-container [ngTemplateOutlet]="inner" />
      </nav>
    } @else {
      <div [class]="innerClasses()">
        <ng-container [ngTemplateOutlet]="inner" />
      </div>
    }
    <ng-template #inner>
      <div mol-flex [align]="'center'" [justify]="'between'" [className]="cm().h('full')">
        <a [class]="brandClassName" [molLink]="brandToValue()">
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
          @if (navigation; as nav) {
            <ul [class]="nav.listClassName">
              @for (entry of navigationLinks(); track entry.to) {
                <li [class]="nav.itemClassName">
                  <a [molLink]="entry.to" [replace]="entry.link.replace" [state]="entry.link.state" [molNavLinkAttrs]="entry.link" (click)="handleLinkClick(entry.link, $event)">@if (templateOf(entry.link.children); as content) {<ng-container [ngTemplateOutlet]="content"></ng-container>}@else {{{ textOf(entry.link.children) }}}</a>
                </li>
              }
            </ul>
          }
          <span data-mol-slot="themeToggle"
            ><ng-content select="[slot=themeToggle]"></ng-content
          ></span>
          @if (showDefaultToggle()) {
            <button mol-theme-toggle></button>
          }
          <span data-mol-slot="extraActions"
            ><ng-content select="[slot=extraActions]"></ng-content
          ></span>
          <span data-mol-slot="userMenu"><ng-content select="[slot=userMenu]"></ng-content></span>
        </div>
      </div>
    </ng-template>`,
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
  /** Additional class on the brand anchor. */
  brandClassName?: string
  /**
   * Primary destinations: when set, the header's inner wrapper becomes the
   * navigation landmark (`<nav aria-label>`) holding the brand, the declared
   * links and the action slots — exactly React's `navigation` prop. Each
   * entry carries React's link props (its content, `className`, `replace`,
   * `state` and every other anchor attribute).
   */
  navigation?: AppHeaderNavigation
  /** Force-hides the default theme toggle when bound to `null` (React's `themeToggle={null}`). */
  themeToggle?: null
  /** Apply `cm.headerFixed` (defaults to `true` at read time). */
  fixed?: boolean
  /** Extra className on the outer `<header>`. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The header host element — the app's projected nodes live inside it. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  /** The theme provider above the header, or null — React's `useContext(ThemeContext)` probe. */
  private readonly themeProvider = inject(THEME_PROVIDER, { optional: true })

  /** The i18n provider above the header, or null — React's `useContext(I18nContext)` probe. */
  private readonly i18nProvider = inject(I18N_PROVIDER, { optional: true })

  private readonly renderer = inject(Renderer2)

  /** Each capture span's anchor comment (marks the slot's position in the DOM). */
  private readonly anchors = new Map<HTMLSpanElement, Comment>()

  /** Whether each slot carries projected nodes (drives the default toggle's `@if`). */
  private readonly slots = signal({ toggle: false, extra: false, menu: false })

  constructor() {
    // A navigation change recreates the outlet view (and its capture spans), so
    // the slots are re-established after every render, not only at view init.
    afterEveryRender(() => this.syncSlots())
  }

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
   * The header inner wrapper's class — `cm.headerInner`, plus the
   * navigation's `className` when one is declared (React composes them the
   * same way), through `cn()` so a token that is a function in the bonded map
   * resolves to its string.
   * @returns The class string.
   */
  innerClasses(): string {
    const navigation = this.navigation
    return navigation?.className
      ? this.cm().cn(this.cm().headerInner, navigation.className)
      : this.cm().cn(this.cm().headerInner)
  }

  /**
   * The declared navigation destinations in declaration order, ready for the
   * template's `@for` (React maps `Object.entries(navigation.links)`).
   * @returns One entry per destination.
   */
  navigationLinks(): NavLinkEntry[] {
    return Object.entries(this.navigation?.links ?? {}).map(([to, link]) => ({ to, link }))
  }

  /**
   * Invokes a navigation link entry's own `onClick`, before the router link's
   * click handler: a handler that calls `preventDefault()` therefore cancels
   * the navigation, exactly as react-router's `<Link>` does.
   *
   * @param link - The destination's link props.
   * @param event - The anchor's click event.
   */
  handleLinkClick(link: NavLinkEntry['link'], event: MouseEvent): void {
    const handler = link.onClick
    if (typeof handler === 'function') handler(event)
  }

  /**
   * Narrows a link's content to an embedded template (React's node child).
   * @param value - The link content.
   * @returns The template, or null for text content.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return asTemplate(value)
  }

  /**
   * Renders text content — React renders a string or a number as text.
   * @param value - The link content.
   * @returns The text, or empty for a template.
   */
  textOf(value: unknown): string {
    return nodeText(value)
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
   * Reads slot presence (the rendered capture spans resolve only at view init:
   * they live in the shared `<ng-template>`'s outlet view), moves every slot's
   * projected nodes to its position and leaves the capture spans out of the
   * DOM — React renders the slots bare.
   */
  ngAfterViewInit(): void {
    this.syncSlots()
  }

  /**
   * Moves every slot's projected nodes to its position and records which slots
   * carry content. Idempotent: once a capture span has been relocated it is
   * gone from the DOM, so a render that does not recreate the outlet view
   * costs one query with no writes.
   */
  private syncSlots(): void {
    const spans = this.captureSpans()
    if (spans.size === 0) return
    const toggle = spans.get('themeToggle')
    const extra = spans.get('extraActions')
    const menu = spans.get('userMenu')
    // Read presence BEFORE relocating: relocate() moves the projected nodes out.
    const state = {
      toggle: toggle ? hasNodes(toggle) : false,
      extra: extra ? hasNodes(extra) : false,
      menu: menu ? hasNodes(menu) : false,
    }
    for (const span of [toggle, extra, menu]) {
      if (span) this.relocate(span)
    }
    const current = this.slots()
    if (
      current.toggle !== state.toggle ||
      current.extra !== state.extra ||
      current.menu !== state.menu
    ) {
      this.slots.set(state)
    }
  }

  /**
   * The rendered capture spans, keyed by slot name. They are found through the
   * host element's DOM because a template query cannot reach a view the
   * `<ng-template>` outlet instantiates.
   * @returns The slot name to capture span map.
   */
  private captureSpans(): Map<string, HTMLSpanElement> {
    const spans = new Map<string, HTMLSpanElement>()
    for (const el of Array.from(
      this.host.nativeElement.querySelectorAll<HTMLSpanElement>('span[data-mol-slot]'),
    )) {
      const slot = el.getAttribute('data-mol-slot')
      if (slot) spans.set(slot, el)
    }
    return spans
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
