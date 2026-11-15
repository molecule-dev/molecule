/**
 * FloatingActionButton component (React parity).
 *
 * @module
 */

import { type AfterViewChecked, Component, ElementRef, inject, ViewChild } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
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
 * The host is a `display: contents` wrapper (`div[mol-floating-action-button]`),
 * unwrapped by the conformance normalizer, because React's root element is the
 * `<a>` when `href` is supplied and the `<button>` otherwise — a standalone
 * component's host tag cannot change at runtime. The projected `[slot=icon]`
 * content is moved from its capture span into the root after view init,
 * matching React's bare `{icon}` position.
 */
@Component({
  selector: 'div[mol-floating-action-button]',
  standalone: true,
  inputs: ['icon', 'label', 'onClick', 'href', 'position', 'size', 'showTooltip', 'className'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `@if (isLink()) {<a [attr.href]="href" [attr.aria-label]="ariaLabel()" [attr.title]="titleAttr()" [attr.class]="commonClass()" [style]="rootStyleText()"><span data-icon-anchor></span></a>} @else {<button type="button" [attr.aria-label]="ariaLabel()" [attr.title]="titleAttr()" [attr.class]="commonClass()" [style]="rootStyleText()" (click)="onClick?.($event)"><span data-icon-anchor></span></button>}<span #iconCapture style="display: none"><ng-content select="[slot=icon]"></ng-content></span>`,
})
export class FloatingActionButton implements AfterViewChecked {
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

  /** The icon slot's capture span (moved out of the DOM once read). */
  @ViewChild('iconCapture') iconCapture?: ElementRef<HTMLSpanElement>

  /** The host element (the `display: contents` wrapper). */
  private readonly el = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the label re-renders on a locale switch (the static `t` does not).
   */
  private readonly i18n = useTranslation()

  /** The projected icon nodes, kept so a branch switch can place them again. */
  private iconNodes: Node[] = []

  /** Whether the icon capture has been read (and its nodes moved into the root). */
  private iconRead = false

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
   * Reads the icon slot once (view queries resolve only after the view is
   * checked) and places its nodes into the root — React renders `{icon}` bare
   * there. Runs after every check so a branch switch (button ↔ link) that
   * re-created the root gets the nodes again and its scaffolding removed.
   */
  ngAfterViewChecked(): void {
    const capture = this.iconCapture?.nativeElement
    if (capture && !this.iconRead) {
      this.iconNodes = Array.from(capture.childNodes).filter(
        (node) => node.nodeType === 1 || (node.nodeType === 3 && (node.textContent ?? '') !== ''),
      )
      this.iconRead = true
    }
    const host = this.el.nativeElement as HTMLElement
    if (host.querySelector('[data-icon-anchor]')) this.placeIcon()
  }

  /**
   * Moves the captured icon nodes to the current root and takes the
   * scaffolding (capture span, anchor) out of the DOM.
   */
  private placeIcon(): void {
    const host = this.el.nativeElement as HTMLElement
    const anchor = host.querySelector('[data-icon-anchor]')
    if (!anchor) return
    const parent = anchor.parentElement
    if (parent) for (const node of this.iconNodes) parent.insertBefore(node, anchor)
    anchor.remove()
    this.iconCapture?.nativeElement.remove()
  }
}
