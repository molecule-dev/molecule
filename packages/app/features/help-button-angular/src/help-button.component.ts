/**
 * HelpButton component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/** Square sizes in pixels, keyed by the size input. */
const SIZE_MAP = { sm: 40, md: 52, lg: 64 } as const

/**
 * Whether an element captured any projected element or non-blank text node.
 *
 * @param el - The capture element.
 * @returns True when at least one projected node renders.
 */
const hasNodes = (el: Element): boolean => {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 1) return true
    if (node.nodeType === 3 && (node.textContent ?? '').trim()) return true
  }
  return false
}

/** The default "?" glyph's inline style, exactly as React writes it. */
const glyphStyle = (dim: number): string => `font-size: ${dim * 0.45}px; font-weight: 700`

/** The notification dot's inline style, exactly as React writes it. */
const DOT_STYLE =
  'position: absolute; top: 4px; right: 4px; width: 10px; height: 10px; border-radius: 50%; background: currentcolor'

/**
 * HelpButton component.
 *
 * Floating (or inline) help button — opens a support panel, chat widget, or
 * docs. Default icon is "?" but apps can swap in their own. Use
 * `position="inline"` inside other UI to drop the fixed positioning and render
 * as a normal in-flow button.
 *
 * The host is a `display: contents` wrapper (`div[mol-help-button]`), unwrapped
 * by the conformance normalizer, because React's root element is the `<a>` when
 * `href` is supplied and the `<button>` otherwise — a standalone component's
 * host tag cannot change at runtime. The projected `[slot=icon]` content is
 * moved from its capture span into the root's content span after view init,
 * matching React's bare `{icon}` position.
 */
@Component({
  selector: 'div[mol-help-button]',
  standalone: true,
  inputs: ['icon', 'label', 'onClick', 'href', 'size', 'position', 'hasNotification', 'className'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `@if (isLink()) {<a [attr.href]="href" [attr.aria-label]="ariaLabel()" [class]="rootClass()" [style]="rootStyleText()" (mouseenter)="enter()" (mouseleave)="leave()"><span [class]="contentClasses()" style="width: 100%; height: 100%"><span data-icon-anchor></span>@if (!hasIcon()) {<span aria-hidden="true" [style]="glyphStyleText()">?</span>}@if (hasNotification) {<span aria-hidden="true" style="${DOT_STYLE}"></span>}</span></a>} @else {<button type="button" [attr.aria-label]="ariaLabel()" [class]="rootClass()" [style]="rootStyleText()" (click)="onClick?.($event)" (mouseenter)="enter()" (mouseleave)="leave()"><span [class]="contentClasses()" style="width: 100%; height: 100%"><span data-icon-anchor></span>@if (!hasIcon()) {<span aria-hidden="true" [style]="glyphStyleText()">?</span>}@if (hasNotification) {<span aria-hidden="true" style="${DOT_STYLE}"></span>}</span></button>}<span #iconCapture style="display: none"><ng-content select="[slot=icon]"></ng-content></span>`,
})
export class HelpButton implements AfterViewInit, DoCheck {
  /** Optional icon — projected `[slot=icon]` content (an input cannot carry a node). */
  icon?: unknown
  /** Accessible label (defaults to `'Help'` through i18n at read time). */
  label?: string
  /** Click handler — React's `onClick`; receives the click event. */
  onClick?: (event: MouseEvent) => void
  /** Navigation target; when set the root is an `<a>` and `onClick` is not called. */
  href?: string
  /** Visual size (defaults to `'md'` at read time). */
  size?: 'sm' | 'md' | 'lg'
  /** Position (defaults to `'bottom-right'` at read time). */
  position?: 'bottom-right' | 'bottom-left' | 'inline'
  /** Show unread/notification dot in the corner. */
  hasNotification?: boolean
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

  /** Whether the pointer is over the root element (React's `hovered` state). */
  private readonly hovered = signal(false)

  /** Whether any icon content was projected (React's `icon != null`). */
  private readonly iconProjected = signal(false)

  /** The projected icon nodes, kept so a branch switch can place them again. */
  private iconNodes: Node[] = []

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
   * The size in pixels (React's `SIZE_MAP[size]` with `'md'` default).
   * @returns The square size in pixels.
   */
  dim(): number {
    return SIZE_MAP[this.size ?? 'md']
  }

  /**
   * The root's inline style, exactly as React writes it (`transform` only
   * while hovered).
   * @returns The `style` attribute text.
   */
  rootStyleText(): string {
    const dim = this.dim()
    const parts = [`width: ${dim}px`, `height: ${dim}px`]
    const position = this.position ?? 'bottom-right'
    if (position === 'bottom-right') {
      parts.push('position: fixed', 'right: 24px', 'bottom: 24px', 'z-index: 40')
    } else if (position === 'bottom-left') {
      parts.push('position: fixed', 'left: 24px', 'bottom: 24px', 'z-index: 40')
    }
    if (this.hovered()) parts.push('transform: scale(1.05)')
    parts.push('transition: transform 150ms ease')
    return parts.join('; ')
  }

  /**
   * The root's class (React passes `className` through unchanged).
   * @returns The class string, or null when there is none.
   */
  rootClass(): string | null {
    return this.className ?? null
  }

  /**
   * The content span's class list.
   * @returns The class string.
   */
  contentClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', justify: 'center' }),
      cm.roundedFull,
      cm.position('relative'),
    )
  }

  /**
   * The root's accessible label (React's `label ?? t('helpButton.label', …)`).
   * @returns The label text.
   */
  ariaLabel(): string {
    return this.label ?? this.i18n.t('helpButton.label', undefined, { defaultValue: 'Help' })
  }

  /**
   * The default glyph's inline style.
   * @returns The `style` attribute text.
   */
  glyphStyleText(): string {
    return glyphStyle(this.dim())
  }

  /**
   * Whether the projected icon renders instead of the default glyph.
   * @returns True when icon content exists.
   */
  hasIcon(): boolean {
    return this.iconProjected()
  }

  /** Marks the pointer as over the root. */
  enter(): void {
    this.hovered.set(true)
  }

  /** Marks the pointer as gone from the root. */
  leave(): void {
    this.hovered.set(false)
  }

  /**
   * Reads the icon slot (view queries resolve only at view init) and moves its
   * nodes into the root's content span — React renders `{icon}` bare there.
   */
  ngAfterViewInit(): void {
    const capture = this.iconCapture?.nativeElement
    if (!capture) return
    this.iconProjected.set(hasNodes(capture))
    this.iconNodes = Array.from(capture.childNodes).filter(
      (node) => node.nodeType === 1 || (node.nodeType === 3 && (node.textContent ?? '') !== ''),
    )
    this.placeIcon()
  }

  /** Places the icon nodes again when a branch switch re-created the anchor. */
  ngDoCheck(): void {
    if (this.iconNodes.length === 0) return
    if ((this.el.nativeElement as HTMLElement).querySelector('[data-icon-anchor]')) this.placeIcon()
  }

  /**
   * Moves the captured icon nodes to the current root's content span and takes
   * the scaffolding (capture span, anchor) out of the DOM.
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
