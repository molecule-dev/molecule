/**
 * HelpButton component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContent,
  placeContentBefore,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/** Square sizes in pixels, keyed by the size input. */
const SIZE_MAP = { sm: 40, md: 52, lg: 64 } as const

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
 * The rendered root is the `<a>` when `href` is supplied and the `<button>`
 * otherwise — a standalone component's host tag cannot change at runtime, so
 * the rendered root stands in front of the host's place and the host itself
 * leaves the page (`placeContentBefore` + `setElementPresent`). The projected
 * `[slot=icon]` content is placed into that root, matching React's bare
 * `{icon}` position.
 */
@Component({
  selector: 'div[mol-help-button]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['icon', 'label', 'onClick', 'href', 'size', 'position', 'hasNotification', 'className'],
  // prettier-ignore
  template: `@if (isLink()) {<a #linkRoot [attr.href]="href" [attr.aria-label]="ariaLabel()" [class]="rootClass()" [style]="rootStyleText()" (mouseenter)="enter()" (mouseleave)="leave()"><span [class]="contentClasses()" style="width: 100%; height: 100%"><span data-icon-anchor></span>@if (!hasIcon()) {<span aria-hidden="true" [style]="glyphStyleText()">?</span>}@if (hasNotification) {<span aria-hidden="true" style="${DOT_STYLE}"></span>}</span></a>} @else {<button #buttonRoot type="button" [attr.aria-label]="ariaLabel()" [class]="rootClass()" [style]="rootStyleText()" (click)="onClick?.($event)" (mouseenter)="enter()" (mouseleave)="leave()"><span [class]="contentClasses()" style="width: 100%; height: 100%"><span data-icon-anchor></span>@if (!hasIcon()) {<span aria-hidden="true" [style]="glyphStyleText()">?</span>}@if (hasNotification) {<span aria-hidden="true" style="${DOT_STYLE}"></span>}</span></button>}<span #iconCapture style="display: none"><ng-content select="[slot=icon]"></ng-content></span>`,
})
export class HelpButton {
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

  /** Whether the pointer is over the root element (React's `hovered` state). */
  private readonly hovered = signal(false)

  /** Whether any icon content was projected (React's `icon != null`). */
  private readonly iconProjected = signal(false)

  /** The icon anchor, kept once it leaves the DOM so later content is placed too. */
  private anchor: HTMLElement | null = null

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * Reads the icon slot, places its content into the current root — React
   * renders `{icon}` bare there — and records whether it was projected.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    this.iconProjected.set(hasContent(this.iconCapture?.nativeElement))
    const host = this.el.nativeElement as HTMLElement
    // React's root is the `<a>`/`<button>` itself: it renders in front of the host's place
    // and the host leaves the page; the icon content then goes into that root.
    placeContentBefore(host, host)
    setElementPresent(host, false)
    this.placeIcon()
  }

  /**
   * Renders the captured icon content inside the current root's content span
   * and takes the scaffolding (capture span, anchor) out of the DOM. The root is
   * found through its template ref: it stands beside the host, not inside it.
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
}
