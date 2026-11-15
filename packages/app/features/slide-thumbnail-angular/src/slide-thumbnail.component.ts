/**
 * SlideThumbnail component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * SlideThumbnail component.
 *
 * Slide thumbnail tile for presentation editors / slideshow navigators. The
 * host IS the `<button>` (`button[mol-slide-thumbnail]`), matching React's
 * root exactly: the live scaled-down preview is projected as the element's
 * default content, and the index badge follows it. Styling routes through
 * ClassMap tokens (`cm.position('relative')` + `cm.cursorPointer`), with the
 * same inline style React sets for the tile canvas and the badge.
 *
 * The translated aria-label is read through the binding's reactive
 * `useTranslation()`, so a locale switch refreshes it (React's components
 * re-render through `useTranslation()`).
 */
@Component({
  selector: 'button[mol-slide-thumbnail]',
  standalone: true,
  inputs: ['index', 'active', 'onClick', 'aspect', 'width', 'className'],
  host: {
    '[attr.type]': "'button'",
    '[attr.aria-current]': 'active ? "true" : null',
    '[attr.data-mol-id]': "'slide-thumbnail'",
    '[attr.data-slide-index]': 'index',
    '[attr.aria-label]': 'label()',
    '[class]': 'classes()',
    '[style.width]': 'widthText()',
    '[style.aspect-ratio]': 'aspectText()',
    '[style.outline]': 'outlineText()',
    '[style.outline-offset]': "'2px'",
    '[style.background]': "'var(--mol-color-surface, #fff)'",
    '[style.overflow]': "'hidden'",
    '[style.border]': "'none'",
    '[style.padding]': "'0'",
    '(click)': 'handleClick($event)',
  },
  template: `<ng-content></ng-content> <span [style]="badgeStyle()">{{ index }}</span>`,
})
export class SlideThumbnail {
  /** Slide index (1-based). */
  index?: number
  /** Whether the thumbnail represents the active slide. */
  active?: boolean
  /** Click handler; receives the DOM click event (React's `onClick`). */
  onClick?: (event: MouseEvent) => void
  /** Optional aspect ratio (defaults to `'16/9'` at read time). */
  aspect?: '16/9' | '4/3' | '1/1'
  /** Width in pixels (defaults to 160 at read time). */
  width?: number
  /** Extra classes. */
  className?: string

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale notifications, so the label re-renders on a locale switch (the
   * static `t` does not).
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
   * Computes the wrapper class list (React's
   * `cm.cn(cm.position('relative'), cm.cursorPointer, className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('relative'), this.cm().cursorPointer, this.className)
  }

  /**
   * The translated accessible label (React's `t('slideThumbnail.label', { index })`).
   * @returns The label text.
   */
  label(): string {
    return this.i18n.t(
      'slideThumbnail.label',
      { index: this.index ?? '' },
      { defaultValue: 'Slide {{index}}' },
    )
  }

  /**
   * The tile width (React's `width`, default 160).
   * @returns The CSS width.
   */
  widthText(): string {
    return `${this.width ?? 160}px`
  }

  /**
   * The tile aspect ratio (React's `aspect`, default 16/9, slash spaced out).
   * @returns The CSS aspect-ratio.
   */
  aspectText(): string {
    return (this.aspect ?? '16/9').replace('/', ' / ')
  }

  /**
   * The active outline (React's `active ? '2px solid currentColor' : 'none'`).
   * @returns The CSS outline.
   */
  outlineText(): string {
    return this.active ? '2px solid currentColor' : 'none'
  }

  /**
   * The index badge's inline style (React's absolute top-left badge, applied
   * as a style map so each declaration lands through the CSSOM as React's do).
   * @returns The style map.
   */
  badgeStyle(): Record<string, string> {
    return {
      position: 'absolute',
      left: '4px',
      top: '4px',
      padding: '0 4px',
      'font-size': '10px',
      'font-weight': '700',
      background: 'rgba(0,0,0,0.6)',
      color: '#fff',
      'border-radius': '3px',
    }
  }

  /**
   * Forwards the click to the React-named handler with the native event.
   *
   * @param event - The native click event.
   */
  handleClick(event: MouseEvent): void {
    this.onClick?.(event)
  }
}
