/**
 * FloatingActionButton component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContent,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/** Vertical square sizes in px, keyed by the size input. */
const SIZE_MAP = { sm: 10, md: 14, lg: 16 } as const

/** The corner's horizontal and vertical offsets, as React writes them. */
const CORNER = {
  'bottom-right': ['right', 'bottom'],
  'bottom-left': ['left', 'bottom'],
  'top-right': ['right', 'top'],
  'top-left': ['left', 'top'],
} as const

/**
 * FloatingActionButton component.
 *
 * Fixed-position circular action button. Renders either an anchor (when
 * `href` is set) or a button (when `onClick` is set). Positioning is
 * inline-style so the component works without extra CSS setup, and it ships
 * with a visible default surface (primary gradient + soft elevation, via the
 * `gradientPrimary`/`shadowLifted` ClassMap tokens). Pass `className` to
 * override the surface — caller classes are resolved last by `cm.cn`
 * (tailwind-merge).
 *
 * The rendered root is the `<a>` when `href` is supplied and the `<button>`
 * otherwise — a standalone component's host tag cannot change at runtime, so
 * the rendered root stands in front of the host's place and the host itself
 * leaves the page (`placeContentBefore` + `setElementPresent`). The projected
 * `[slot=icon]` content is placed into that root, matching React's bare `{icon}`
 * position.
 */
@Component({
  selector: 'div[mol-floating-action-button]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['icon', 'label', 'onClick', 'href', 'position', 'size', 'showTooltip', 'className'],
  // prettier-ignore
  template: `@if (isLink()) {<a #linkRoot [attr.href]="href" [attr.aria-label]="ariaLabel()" [attr.title]="titleAttr()" [attr.class]="commonClass()" [style]="rootStyleText()"><span data-icon-anchor></span></a>} @else {<button #buttonRoot type="button" [attr.aria-label]="ariaLabel()" [attr.title]="titleAttr()" [attr.class]="commonClass()" [style]="rootStyleText()" (click)="onClick?.($event)"><span data-icon-anchor></span></button>}<span #iconCapture style="display: none"><ng-content select="[slot=icon]"></ng-content></span>`,
})
export class FloatingActionButton {
  /** Icon — projected `[slot=icon]` content (an input cannot carry a node). */
  icon?: unknown
  /** Accessible label (also the tooltip text and i18n key). */
  label?: string
  /** Click handler — React's `onClick`; receives the click event. */
  onClick?: (event: MouseEvent) => void
  /** Navigation target; when set the root is an `<a>` and `onClick` is not called. */
  href?: string
  /** Screen corner (defaults to `'bottom-right'` at read time). */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  /** Visual size (defaults to `'md'` at read time). */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show the label on hover (defaults to true at read time). */
  showTooltip?: boolean
  /** Extra classes on the root element. */
  className?: string

  /** The icon slot's capture span (kept out of the DOM; its content is the icon). */
  @ViewChild('iconCapture') iconCapture?: ElementRef<HTMLSpanElement>

  /** The `<a>` root, while `href` is set. */
  @ViewChild('linkRoot') private linkRoot?: ElementRef<HTMLElement>
  /** The `<button>` root, while `href` is not set. */
  @ViewChild('buttonRoot') private buttonRoot?: ElementRef<HTMLElement>

  /** The host element (React renders no element of its own). */
  private readonly el = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the label re-renders on a locale switch (the static `t` does not).
   */
  private readonly i18n = useTranslation()

  /** The icon anchor, kept once it leaves the DOM so later content is placed too. */
  private anchor: HTMLElement | null = null

  constructor() {
    // React's root is the `<a>`/`<button>` itself: it renders in front of the host's place
    // and the host leaves the page; the icon content then goes into that root.
    usePlacement(() => {
      const host = this.el.nativeElement as HTMLElement
      placeContentBefore(host, host)
      setElementPresent(host, false)
      this.placeIcon()
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
   * Whether the root renders as an `<a>` (React's `href ?` branch).
   * @returns True when `href` is set.
   */
  isLink(): boolean {
    return !!this.href
  }

  /**
   * The size in pixels (React's `SIZE_MAP[size] * 4` with `'md'` default).
   * @returns The square size in pixels.
   */
  dim(): number {
    return SIZE_MAP[this.size ?? 'md'] * 4
  }

  /**
   * The root's inline style, exactly as React writes it: the corner offsets,
   * then the square size, then the stacking level.
   * @returns The `style` attribute text.
   */
  rootStyleText(): string {
    const [x, y] = CORNER[this.position ?? 'bottom-right']
    const dim = this.dim()
    return `position: fixed; ${x}: 24px; ${y}: 24px; width: ${dim}px; height: ${dim}px; z-index: 40`
  }

  /**
   * The root's class list (default surface + the caller's extra classes).
   * @returns The class string.
   */
  commonClass(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', justify: 'center' }),
      cm.roundedFull,
      cm.gradientPrimary,
      cm.shadowLifted,
      this.className,
    )
  }

  /**
   * The root's accessible label (React's `t(label, {}, { defaultValue: label })`).
   * @returns The label text.
   */
  ariaLabel(): string {
    const label = this.label ?? ''
    return this.i18n.t(label, {}, { defaultValue: label })
  }

  /**
   * The tooltip `title` attribute, or null when `showTooltip` is false.
   * @returns The title text, or null.
   */
  titleAttr(): string | null {
    return (this.showTooltip ?? true) ? this.ariaLabel() : null
  }

  /**
   * Places the icon slot's content into the current root — React renders
   * `{icon}` bare there. Runs on every placement so a branch switch
   * (button ↔ link) that re-created the root gets the content again. The root is
   * found through its template ref, not the host: the root stands beside the
   * host, not inside it.
   */
  private placeIcon(): void {
    const root = (this.linkRoot?.nativeElement ?? this.buttonRoot?.nativeElement) as
      HTMLElement | undefined
    const anchor = root?.querySelector<HTMLElement>('[data-icon-anchor]') ?? this.anchor
    const capture = this.iconCapture?.nativeElement
    if (!root || !anchor || !capture) return
    this.anchor = anchor
    if (anchor.parentNode === null) setElementPresent(anchor, true)
    const parent = anchor.parentElement
    if (parent) placeContent(capture, parent, anchor)
    setElementPresent(anchor, false)
    setElementPresent(capture, false)
  }
}
