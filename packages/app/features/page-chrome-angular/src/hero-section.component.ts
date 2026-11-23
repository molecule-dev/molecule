/**
 * HeroSection component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * HeroSection component.
 *
 * Dashboard / landing hero: text column on the left, optional media on the
 * right. The host IS the outer `<section>` (`section[mol-hero-section]`),
 * matching React's root exactly. Alignment defaults to `start` for
 * dashboards; use `align="center"` for marketing-style landing heroes.
 *
 * Node props are projected content: `eyebrow` is `[slot=eyebrow]`, `title`
 * `[slot=title]`, `description` `[slot=description]`, `primaryAction`
 * `[slot=primaryAction]`, `secondaryAction` `[slot=secondaryAction]` and
 * `media` `[slot=media]`. React omits the eyebrow, the description paragraph,
 * the action row and the media column when their node is absent, and swaps
 * the root's horizontal justification when media is present — so those
 * wrappers are removed while their projection is empty, restored in place
 * when content is projected again, and the root class follows the media
 * column's presence.
 */
@Component({
  selector: 'section[mol-hero-section]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['align', 'className', 'dataMolId'],
  host: {
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  template: `<div [class]="textColumnClasses()">
      <div #eyebrowEl [class]="eyebrowClasses()">
        <ng-content select="[slot=eyebrow]"></ng-content>
      </div>
      <h1 [class]="titleClasses()"><ng-content select="[slot=title]"></ng-content></h1>
      <p #descriptionEl [class]="descriptionClasses()">
        <ng-content select="[slot=description]"></ng-content>
      </p>
      <div #actionsEl [class]="actionsClasses()">
        <ng-content select="[slot=primaryAction]"></ng-content
        ><ng-content select="[slot=secondaryAction]"></ng-content>
      </div>
    </div>
    <div #mediaEl [class]="mediaClasses()"><ng-content select="[slot=media]"></ng-content></div>`,
})
export class HeroSection {
  /** The host element: the root `<section>` React renders. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  /** Horizontal alignment — defaults to `'start'` at read time. */
  align?: 'start' | 'center'
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The eyebrow line (React renders it only while an eyebrow exists). */
  @ViewChild('eyebrowEl') eyebrowEl?: ElementRef<HTMLElement>
  /** The description paragraph (React renders it only while a description exists). */
  @ViewChild('descriptionEl') descriptionEl?: ElementRef<HTMLElement>
  /** The action row (React renders it only while an action exists). */
  @ViewChild('actionsEl') actionsEl?: ElementRef<HTMLElement>
  /** The media column (React renders it only while media exists). */
  @ViewChild('mediaEl') mediaEl?: ElementRef<HTMLElement>

  /** Whether the media column carries content (drives the root's justification). */
  private readonly media = signal(false)

  constructor() {
    usePlacement((hasContent) => this.sync(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The root class: the flex row (justified `between` while a media column
   * exists, else `start`), vertical padding, and `className`.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({
        align: 'center',
        justify: this.mediaPresent() ? 'between' : 'start',
        gap: 'lg',
        wrap: 'wrap',
      }),
      this.cm().sp('py', 10),
      this.className,
    )
  }

  /**
   * The text column's class (`cm.stack(4)` + `cm.flex1`, centered when `align="center"`).
   * @returns The class string.
   */
  textColumnClasses(): string {
    return this.cm().cn(
      this.cm().stack(4),
      this.cm().flex1,
      this.align === 'center' ? this.cm().textCenter : undefined,
    )
  }

  /**
   * The eyebrow line's class (`cm.textSize('sm')` + `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  eyebrowClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * The headline's class (`cm.textSize('4xl')` + `cm.fontWeight('bold')`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('4xl'), this.cm().fontWeight('bold'))
  }

  /**
   * The description paragraph's class (`cm.textSize('lg')` + `cm.maxW('2xl')`).
   * @returns The class string.
   */
  descriptionClasses(): string {
    return this.cm().cn(this.cm().textSize('lg'), this.cm().maxW('2xl'))
  }

  /**
   * The action row's class (`cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })`).
   * @returns The class string.
   */
  actionsClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm', wrap: 'wrap' })
  }

  /**
   * The media column's class (`cm.shrink0`), through `cn()` so a token that is
   * a function in the bonded map resolves to its string.
   * @returns The class string.
   */
  mediaClasses(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * Whether a media column is present, as React's `media ? … : …` sees it.
   * @returns True while media content exists.
   */
  mediaPresent(): boolean {
    return this.media()
  }

  /**
   * Withholds the optional regions React omits, restores the ones with content,
   * and writes the root class: its justification follows the media column,
   * which only the projected DOM can tell us, so it is set here instead of by
   * a binding (a binding would read a value that changes within the same check).
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private sync(hasContent: SlotReader): void {
    const eyebrow = this.eyebrowEl?.nativeElement
    setElementPresent(eyebrow, hasContent(eyebrow))
    const description = this.descriptionEl?.nativeElement
    setElementPresent(description, hasContent(description))
    const actions = this.actionsEl?.nativeElement
    setElementPresent(actions, hasContent(actions))
    const media = this.mediaEl?.nativeElement
    const mediaPresent = hasContent(media)
    this.media.set(mediaPresent)
    setElementPresent(media, mediaPresent)
    this.host.nativeElement.setAttribute('class', this.classes())
  }
}
