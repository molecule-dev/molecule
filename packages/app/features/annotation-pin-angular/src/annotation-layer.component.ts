/**
 * AnnotationLayer component (React parity).
 *
 * @module
 */

import { NgStyle } from '@angular/common'
import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { reactStyleText, toStyleProps } from '@molecule/app-ui-angular'

import { AnnotationPin } from './annotation-pin.component.js'
import type { Pin } from './types.js'

/**
 * Wrapper that manages multiple pins on a parent surface. Renders its
 * projected content (the surface — typically an `<img>`, `<canvas>`, or
 * map-tile element) and overlays each `pins[]` entry as a clickable
 * `<AnnotationPin>` marker.
 *
 * The host IS the outer `<div>` (`div[mol-annotation-layer]`), matching
 * React's root exactly; the annotated surface is projected as the host's
 * default content. The layer itself carries `position: relative` so absolute
 * pin positioning works without the caller providing a wrapper.
 *
 * Click behaviour:
 * - clicking a pin marker fires `onPinClick(pinId)`
 * - clicking empty space on the layer fires `onSurfaceClick({ x, y })`,
 *   which callers typically use to add a new pin. That action lives on an
 *   invisible "add annotation pin" button covering the surface: pointer
 *   clicks place a pin at the click position; activating the button with a
 *   keyboard (Tab to it, then Enter / Space) or assistive tech places a pin
 *   at the surface centre.
 *
 * This is the Angular counterpart of `@molecule/app-annotation-pin-react`.
 */
@Component({
  selector: 'div[mol-annotation-layer]',
  standalone: true,
  imports: [AnnotationPin, NgStyle],
  inputs: [
    'pins',
    'activePinId',
    'onPinClick',
    'onSurfaceClick',
    'normalised',
    'popupSide',
    'className',
    'style',
  ],
  host: {
    role: 'region',
    '[attr.aria-label]': 'regionLabel()',
    'data-mol-id': 'annotation-layer',
    '[class]': 'classes()',
    '[attr.style]': 'rootStyle()',
  },
  // prettier-ignore
  template: `<ng-content></ng-content>@if (onSurfaceClick) {<button type="button" [attr.aria-label]="addPinLabel()" data-mol-id="annotation-layer-add-pin" (click)="handleSurfaceClick($event)" [class]="addPinClasses()" [ngStyle]="addPinStyles()"></button>}@for (pin of pins; track pin.id) {<div mol-annotation-pin [position]="pin.position" [label]="pin.label" [note]="pin.note" [selected]="activePinId === pin.id" [popupSide]="popupSide ?? 'right'" [normalised]="normalisedValue()" [onClick]="clickFor(pin)"></div>}`,
})
export class AnnotationLayer {
  /** Pins to render on the layer. */
  pins: Pin[] = []
  /** The currently active (popup-open) pin id, or `null` for none. */
  activePinId?: string | null
  /** Called with the clicked pin id when a pin marker is clicked. */
  onPinClick?: (pinId: string) => void
  /** Called with the clicked position when an empty area of the layer is clicked. */
  onSurfaceClick?: (position: { x: number; y: number }) => void
  /** Whether positions are normalised (defaults to `true` at read time). */
  normalised?: boolean
  /** Side the popup renders on, relative to its marker (defaults to `'right'`). */
  popupSide?: 'top' | 'bottom' | 'left' | 'right'
  /** Extra classes merged onto the layer root. */
  className?: string
  /** Inline style for the layer root, merged over the layer's own. */
  style?: Record<string, string | number>

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch.
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Whether positions are normalised (React's `normalised = true` default).
   * @returns The normalised flag.
   */
  normalisedValue(): boolean {
    return this.normalised ?? true
  }

  /**
   * The layer root's class list (React's `cm.cn(className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The layer root's inline style (React's `rootStyle`: the caller's style wins).
   * @returns The serialised style attribute.
   */
  rootStyle(): string {
    return (
      reactStyleText({
        position: 'relative',
        width: '100%',
        height: '100%',
        ...(this.style ?? {}),
      }) ?? ''
    )
  }

  /**
   * The add-pin target's class list (React's
   * `cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)`).
   * @returns The class string.
   */
  addPinClasses(): string {
    return this.cm().cn(this.cm().position('absolute'), this.cm().inset0, this.cm().cursorPointer)
  }

  /**
   * The add-pin target's inline style — the browser's default button chrome
   * reset (the target is invisible, not a visible control), as a style map so
   * the CSSOM normalises it exactly as React's own inline styles do.
   * @returns The style map.
   */
  addPinStyles(): Record<string, string> {
    return toStyleProps({ border: 'none', padding: 0, background: 'transparent' }) ?? {}
  }

  /**
   * The layer's accessible label (React's `annotationPin.aria.layer`).
   * @returns The label text.
   */
  regionLabel(): string {
    return this.i18n.t('annotationPin.aria.layer', {}, { defaultValue: 'Annotation layer' })
  }

  /**
   * The add-pin target's accessible label (React's `annotationPin.aria.addPin`).
   * @returns The label text.
   */
  addPinLabel(): string {
    return this.i18n.t('annotationPin.aria.addPin', {}, { defaultValue: 'Add annotation pin' })
  }

  /**
   * The click handler a pin marker receives (React's
   * `() => onPinClick?.(pin.id)`).
   *
   * @param pin - The pin the marker belongs to.
   * @returns The handler.
   */
  clickFor(pin: Pin): () => void {
    return (): void => this.onPinClick?.(pin.id)
  }

  /**
   * Computes the clicked position relative to the add-pin button's box (which
   * covers the layer) and forwards to `onSurfaceClick`. If `normalised` is
   * `true`, the returned coordinates are 0..1 fractions; otherwise they are
   * raw pixel offsets.
   *
   * Clicks produced by keyboard activation (Enter / Space on the focused
   * button) or assistive tech carry `detail === 0` and no pointer position —
   * such clicks place the pin at the surface centre. Pin markers and popups
   * never reach this handler: they stack above the button and are its
   * siblings, so their clicks do not hit it.
   *
   * @param event - The originating mouse event.
   */
  handleSurfaceClick(event: MouseEvent): void {
    if (!this.onSurfaceClick) return
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const keyboardActivated = event.detail === 0
    const px = keyboardActivated ? rect.width / 2 : event.clientX - rect.left
    const py = keyboardActivated ? rect.height / 2 : event.clientY - rect.top
    const safeRectWidth = rect.width || 1
    const safeRectHeight = rect.height || 1
    const x = this.normalisedValue() ? px / safeRectWidth : px
    const y = this.normalisedValue() ? py / safeRectHeight : py
    this.onSurfaceClick({ x, y })
  }
}
