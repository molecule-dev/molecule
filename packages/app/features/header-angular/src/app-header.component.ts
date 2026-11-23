/**
 * AppHeader component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, ElementRef, inject, signal, type TemplateRef } from '@angular/core'

import {
  I18N_PROVIDER,
  Link,
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  type SlotReader,
  THEME_PROVIDER,
  usePlacement,
} from '@molecule/app-angular'
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
  hostDirectives: [MolPlacement],
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
export class AppHeader {
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

  /** Whether each slot carries projected nodes (drives the default toggle's `@if`). */
  private readonly slots = signal({ toggle: false, extra: false, menu: false })

  /**
   * The rendered capture spans, kept once a span leaves the DOM so content that
   * arrives later is still read and placed.
   */
  private readonly spans = new Map<string, HTMLSpanElement>()

  constructor() {
    // The placement runs after a navigation change recreates the outlet view
    // (and its capture spans), so the slots are re-established then too.
    usePlacement((hasContent) => this.syncSlots(hasContent))
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
   * Places every slot's projected content at its position and records which
   * slots carry content. Idempotent: once a capture span has been taken out of
   * the DOM it is no longer found there, so its kept reference is used instead.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private syncSlots(hasContent: SlotReader): void {
    const spans = this.captureSpans()
    if (spans.size === 0) return
    const toggle = spans.get('themeToggle')
    const extra = spans.get('extraActions')
    const menu = spans.get('userMenu')
    // Read presence BEFORE relocating: the placement moves the projected nodes out.
    const state = {
      toggle: toggle ? hasContent(toggle) : false,
      extra: extra ? hasContent(extra) : false,
      menu: menu ? hasContent(menu) : false,
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
   * The rendered capture spans, keyed by slot name, merged with the spans kept
   * from earlier renders. They are found through the host element's DOM because
   * a template query cannot reach a view the `<ng-template>` outlet
   * instantiates, and a span the placement already took out of the DOM is kept
   * so content that arrives later is read and placed too.
   * @returns The slot name to capture span map.
   */
  private captureSpans(): Map<string, HTMLSpanElement> {
    for (const el of Array.from(
      this.host.nativeElement.querySelectorAll<HTMLSpanElement>('span[data-mol-slot]'),
    )) {
      const slot = el.getAttribute('data-mol-slot')
      if (slot) this.spans.set(slot, el)
    }
    return this.spans
  }

  /**
   * Places one slot's projected content at the slot's position and takes the
   * now-empty capture span out of the DOM — React renders `{slot}` with no
   * wrapper element. The content stands bare in front of the span's own place,
   * so it follows the span wherever Angular puts it; a span already out of the
   * DOM keeps its content, which is placed at the span's place when Angular
   * re-adds it.
   *
   * @param span - The capture span.
   */
  private relocate(span: HTMLSpanElement): void {
    placeContentBefore(span, span)
    setElementPresent(span, false)
  }
}
