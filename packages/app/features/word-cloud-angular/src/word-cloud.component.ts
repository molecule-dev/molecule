/**
 * WordCloud component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'

import { packWords } from './packing.js'
import type { PlacedWord, Word, WordCloudOrientation } from './types.js'

// Category palette (data): a word's hue is its own identity, not a theme status tone.
const DEFAULT_PALETTE = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#f59e0b'] as const

/**
 * WordCloud component.
 *
 * Renders each word at a font size proportional to its `value`, packed with
 * the hand-rolled spiral algorithm so larger words sit nearest the center.
 * SVG output, no external library. The host IS the root `<svg>`
 * (`svg[mol-word-cloud]`), matching React's root exactly: `width`, `height`,
 * `viewBox`, `role`, `aria-label`, `data-mol-id` and `class` live on it.
 *
 * Counterpart of `@molecule/app-word-cloud-react`'s `WordCloud`: the same
 * props (React names), the same ClassMap tokens, and the same DOM for the same
 * input. All UI text routes through `t('word-cloud.*')` from
 * `@molecule/app-angular`'s `useTranslation()`, read reactively so a locale
 * switch refreshes the aria label.
 */
@Component({
  selector: 'svg[mol-word-cloud]',
  standalone: true,
  inputs: [
    'words',
    'width',
    'height',
    'minFontSize',
    'maxFontSize',
    'colorScale',
    'orientation',
    'onWordClick',
    'ariaLabel',
    'className',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.width]': 'svgWidth()',
    '[attr.height]': 'svgHeight()',
    '[attr.viewBox]': 'viewBox()',
    '[attr.aria-label]': 'label()',
    role: 'img',
    'data-mol-id': 'word-cloud',
  },
  template: `@for (p of placed(); track $index) {
    <svg:text
      [attr.x]="p.x"
      [attr.y]="p.y"
      [attr.font-size]="p.fontSize"
      [attr.fill]="fillFor(p, $index)"
      text-anchor="middle"
      dominant-baseline="central"
      [attr.transform]="transformFor(p)"
      [attr.data-mol-id]="'word-cloud-word-' + p.word.text"
      [attr.data-value]="p.word.value"
      [attr.data-rotation]="p.rotation"
      [attr.tabindex]="tabIndex()"
      [style.cursor]="onWordClick ? 'pointer' : null"
      (click)="clickWord(p)"
    >
      {{ p.word.text }}
    </svg:text>
  }`,
})
export class WordCloud {
  /** Words to render, in any order — placement is sorted internally by `value`. */
  words: Word[] = []
  /** SVG width in px (defaults to 400 at read time). */
  width?: number
  /** SVG height in px (defaults to 300 at read time). */
  height?: number
  /** Smallest font size for the lowest-weight word (defaults to 12). */
  minFontSize?: number
  /** Largest font size for the highest-weight word (defaults to 64). */
  maxFontSize?: number
  /** Color palette cycled through for words without an explicit `color`. */
  colorScale?: readonly string[]
  /** `'horizontal'` (default) or `'mixed'` (every fourth word at 90deg). */
  orientation?: WordCloudOrientation
  /** Called with the source word when a word is clicked (React's `onWordClick`). */
  onWordClick?: (word: Word) => void
  /** Optional accessible label for the whole SVG (defaults through i18n). */
  ariaLabel?: string
  /** Extra classes merged onto the SVG root via `cm.cn`. */
  className?: string

  /** The translation function, read reactively so a locale switch re-renders. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the root class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The effective SVG width (React's default parameter: an absent or
   * later-bound write of `undefined` must not erase the `400` default).
   * @returns The width in px.
   */
  svgWidth(): number {
    return this.width ?? 400
  }

  /**
   * The effective SVG height.
   * @returns The height in px.
   */
  svgHeight(): number {
    return this.height ?? 300
  }

  /**
   * The SVG `viewBox` for the current size.
   * @returns The viewBox string.
   */
  viewBox(): string {
    return `0 0 ${this.svgWidth()} ${this.svgHeight()}`
  }

  /**
   * The root `aria-label`: the empty label when nothing could be placed,
   * otherwise the caller's label or the i18n default.
   * @returns The aria label.
   */
  label(): string {
    if (this.placed().length === 0)
      return this.i18n.t('word-cloud.aria.empty', {}, { defaultValue: 'No words to display' })
    return (
      this.ariaLabel ?? this.i18n.t('word-cloud.aria.cloud', {}, { defaultValue: 'Word cloud' })
    )
  }

  /**
   * The packed words for the current props.
   * @returns The placed words, in placement order.
   */
  placed(): PlacedWord[] {
    return packWords(this.words, {
      width: this.svgWidth(),
      height: this.svgHeight(),
      minFontSize: this.minFontSize ?? 12,
      maxFontSize: this.maxFontSize ?? 64,
      orientation: this.orientation ?? 'horizontal',
    })
  }

  /**
   * The rotation transform of one placed word (none at 0deg, as in React).
   * @param p - The placed word.
   * @returns The `transform` attribute value, or null to omit it.
   */
  transformFor(p: PlacedWord): string | null {
    return p.rotation === 0 ? null : `rotate(${p.rotation} ${p.x} ${p.y})`
  }

  /**
   * The fill color of one placed word: its explicit color, else the palette
   * entry at its position.
   * @param p - The placed word.
   * @param index - Its placement index.
   * @returns The color, or null when the palette is empty.
   */
  fillFor(p: PlacedWord, index: number): string | null {
    const palette = this.colorScale ?? DEFAULT_PALETTE
    return p.word.color ?? palette[index % palette.length] ?? null
  }

  /**
   * The `tabindex` of every word: focusable only when a click handler exists.
   * @returns `0` or `-1`.
   */
  tabIndex(): number {
    return this.onWordClick ? 0 : -1
  }

  /**
   * Hands a clicked word to the callback, as React's `onClick` does.
   * @param p - The placed word whose `<text>` was clicked.
   */
  clickWord(p: PlacedWord): void {
    this.onWordClick?.(p.word)
  }
}
