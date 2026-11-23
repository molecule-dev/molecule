/**
 * ListingCardMedia component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type ElementRef, type TemplateRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { ListingCardMediaProps } from './types.js'

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
 * The `<img>` and the overlay wrapper stay in the template and leave the page
 * while React would not render them; the caller's node renders where React's
 * `children` goes, so content projected later replaces the `<img>` too.
 */
@Component({
  selector: 'div[mol-listing-card-media]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [NgTemplateOutlet],
  inputs: ['src', 'alt', 'aspect', 'overlay', 'className'],
  host: {
    '[class]': 'classes()',
    '[style.aspect-ratio]': 'aspectText()',
  },
  // prettier-ignore
  template: `<img #img [attr.alt]="alt ?? ''" style="width: 100%; height: 100%; object-fit: cover" /><span #childrenSlot><ng-content></ng-content></span><div #overlayEl [class]="overlayClasses()">@if (overlayTemplate(); as overlayTpl) {<ng-container [ngTemplateOutlet]="overlayTpl" />}<ng-content select="[slot=overlay]"></ng-content></div>`,
})
export class ListingCardMedia {
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

  /** The `<img>` fallback (in the page, with its source, only while React renders it). */
  @ViewChild('img', { static: true }) private img?: ElementRef<HTMLImageElement>
  /** The capture of the caller's node; its content renders in its place. */
  @ViewChild('childrenSlot', { static: true }) private childrenSlot?: ElementRef<HTMLElement>
  /** The overlay wrapper (in the page only while there is an overlay). */
  @ViewChild('overlayEl', { static: true }) private overlayEl?: ElementRef<HTMLElement>

  /**
   * Renders React's `children ?? (src && <img>)` and `{overlay && <div>…}`,
   * following projected content that arrives or leaves after the first render.
   */
  constructor() {
    usePlacement((hasContent) => this.sync(hasContent))
  }

  /**
   * Applies the image, children and overlay presence.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private sync(hasContent: SlotReader): void {
    const children = this.childrenSlot?.nativeElement
    placeContentBefore(children, children)
    setElementPresent(children, false)
    const img = this.img?.nativeElement
    const showImage = !hasContent(children) && !!this.src
    // The source is set only while the <img> shows: React creates no <img> while children
    // replace it, so the browser requests no image.
    if (showImage) img?.setAttribute('src', this.src!)
    else img?.removeAttribute('src')
    setElementPresent(img, showImage)
    const overlay = this.overlayEl?.nativeElement
    setElementPresent(overlay, this.overlayTemplate() !== null || hasContent(overlay))
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
   * The overlay node template, when the overlay arrived as a node-valued prop.
   * @returns The template, or null when none was passed.
   */
  overlayTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.overlay) ? this.overlay : null
  }
}
