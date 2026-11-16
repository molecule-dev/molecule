/**
 * ListingCardMedia component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  Component,
  ElementRef,
  inject,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { hasNodes } from '@molecule/app-ui-angular'

import type { ListingCardMediaProps } from './types.js'

/**
 * Whether a node is something a caller can see (an element, or a non-blank
 * text node).
 *
 * @param node - The DOM node.
 * @returns True when it renders anything.
 */
const hasRenderable = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE ||
  (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0)

/**
 * Whether a value is an overlay node template (a node-valued prop the kit
 * passes as a `TemplateRef`).
 *
 * @param value - The prop value.
 * @returns True for a node template.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' && value !== null && 'createEmbeddedView' in value

/**
 * ListingCardMedia component.
 *
 * Media slot at the top of a listing card. The host IS the root `div`
 * (`div[mol-listing-card-media]`), matching React's root exactly: the ClassMap
 * classes and the inline `aspect-ratio` live on it. The caller's node is the
 * default projected content and replaces the `<img>` fallback; `overlay` is
 * projected as `[slot=overlay]` into the absolutely-positioned inset-0 layer.
 *
 * @remarks
 * Angular projection needs the capture points mounted, so the `<img>` and the
 * overlay wrapper render optimistically and
 * {@link ListingCardMedia.ngAfterViewInit} withdraws the ones React would not
 * render.
 */
@Component({
  selector: 'div[mol-listing-card-media]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['src', 'alt', 'aspect', 'overlay', 'className'],
  host: {
    '[class]': 'classes()',
    '[style.aspect-ratio]': 'aspectText()',
  },
  // prettier-ignore
  template: `@if (showImage()) {<img #img [attr.src]="src ?? null" [attr.alt]="alt ?? ''" style="width: 100%; height: 100%; object-fit: cover" />}<ng-content></ng-content>@if (showOverlay()) {<div #overlayEl [class]="overlayClasses()">@if (overlayTemplate(); as overlayTpl) {<ng-container [ngTemplateOutlet]="overlayTpl" />}<ng-content select="[slot=overlay]"></ng-content></div>}`,
})
export class ListingCardMedia implements AfterViewInit {
  /** Image URL. */
  src?: string
  /** Image alternative text (defaults to an empty string). */
  alt?: string
  /** Aspect ratio (defaults to `'4/3'` at read time). */
  aspect?: ListingCardMediaProps['aspect']
  /** Overlay node — `[slot=overlay]` projected content, or a node template input. */
  overlay?: unknown
  /** Extra classes. */
  className?: string

  /** The `<img>` fallback, while it renders. */
  @ViewChild('img') private img?: ElementRef<HTMLImageElement>
  /** The overlay wrapper, while it renders. */
  @ViewChild('overlayEl') private overlayEl?: ElementRef<HTMLElement>

  /** The host element (the root `<div>`). */
  private readonly el = inject(ElementRef)

  /**
   * Whether the caller projected a media node (React's `children ??
   * (src && <img>)`): true once the first view sees projected content.
   */
  private readonly childrenProjected = signal(false)
  /**
   * Whether a `[slot=overlay]` projection landed: true (optimistically) until
   * the first view proves otherwise.
   */
  private readonly overlayProjected = signal(true)

  /** Reads the first render: the projection replaces the `<img>`, and an empty overlay wrapper is withdrawn. */
  ngAfterViewInit(): void {
    const host = this.el.nativeElement as HTMLElement
    const own = new Set<Node>()
    if (this.img) own.add(this.img.nativeElement)
    if (this.overlayEl) own.add(this.overlayEl.nativeElement)
    const projected = Array.from(host.childNodes).some(
      (node) => !own.has(node) && hasRenderable(node),
    )
    if (projected) this.childrenProjected.set(true)
    const overlay = this.overlayEl?.nativeElement
    if (overlay) this.overlayProjected.set(hasNodes(overlay))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The root class list (React's `cm.cn(cm.position('relative'), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('relative'), this.className)
  }

  /**
   * The overlay layer's class list (React's
   * `cm.cn(cm.position('absolute'), cm.inset0)`).
   * @returns The class string.
   */
  overlayClasses(): string {
    return this.cm().cn(this.cm().position('absolute'), this.cm().inset0)
  }

  /**
   * The aspect ratio (React's `aspect.replace('/', ' / ')`).
   * @returns The CSS aspect-ratio value.
   */
  aspectText(): string {
    return (this.aspect ?? '4/3').replace('/', ' / ')
  }

  /**
   * Whether the `<img>` fallback renders (a projected node replaces it).
   * @returns True when the image shows.
   */
  showImage(): boolean {
    return !this.childrenProjected() && !!this.src
  }

  /**
   * The overlay node template, when the overlay arrived as a node-valued prop.
   * @returns The template, or null when none was passed.
   */
  overlayTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.overlay) ? this.overlay : null
  }

  /**
   * Whether the overlay wrapper renders.
   * @returns True when the overlay layer shows.
   */
  showOverlay(): boolean {
    return this.overlayTemplate() !== null || this.overlayProjected()
  }
}
