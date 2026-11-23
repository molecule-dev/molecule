/**
 * TermsPage component (React parity): the default Terms-of-service page
 * scaffold.
 *
 * @module
 */

import { Component, ElementRef, inject, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContent,
  placeElementBefore,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { SpacingScale, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { LegalPageLayout } from './legal-page-layout.component.js'

/**
 * TermsPage component.
 *
 * Default Terms-of-service page scaffold: the canonical boilerplate Terms page,
 * or the projected body when the app supplies one. React's root is the layout's
 * `<main>`, so that `<main>` renders immediately before the host's place and
 * the host itself never appears in the page; the heading is projected into
 * `LegalPageLayout`'s `[slot=title]`.
 *
 * React renders the boilerplate intro paragraph only when no children were
 * passed and the projected body otherwise, so both capture points exist and
 * {@link TermsPage.syncBody} keeps whichever React would have rendered.
 */
@Component({
  selector: 'mol-terms-page',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [LegalPageLayout],
  inputs: ['titleKey', 'titleDefault', 'introKey', 'introDefault', 'stackGap'],
  template: `<main #pageMain mol-legal-page-layout [dataMolId]="'page-terms'" [stackGap]="stackGap">
    <ng-container ngProjectAs="[slot=title]">{{ titleText() }}</ng-container>
    <p #introEl>{{ introText() }}</p>
    <span #contentSlot><ng-content></ng-content></span>
  </main>`,
})
export class TermsPage {
  /** i18n key for the page heading (defaults to `terms.title` at read time). */
  titleKey?: string
  /** Default for the heading when the i18n key is missing (defaults to `Terms`). */
  titleDefault?: string
  /** i18n key for the single-paragraph intro (ignored when content is projected). */
  introKey?: string
  /** Default intro body when the key is missing. */
  introDefault?: string
  /** Stack gap between body children. */
  stackGap?: SpacingScale

  /** The boilerplate intro paragraph (React renders none when children are passed). */
  @ViewChild('introEl') private introEl?: ElementRef<HTMLElement>
  /** The projected body's capture point. */
  @ViewChild('contentSlot') private contentSlot?: ElementRef<HTMLElement>
  /** The layout `<main>` (React's root, rendered beside the host). */
  @ViewChild('pageMain', { read: ElementRef }) private pageMain?: ElementRef<HTMLElement>

  /** Which body form renders last (null until the first pass). */
  private bodyMode: 'intro' | 'content' | null = null
  /** Where the body renders (kept once seen: a detached capture point has no parent). */
  private bodyParent: HTMLElement | null = null

  /** The reactive i18n binding, read in the injection context. */
  private readonly i18n = useTranslation()

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    usePlacement((hasContent) => {
      const main = this.pageMain?.nativeElement
      if (!main) return
      // React's root is the layout's <main>; the host itself leaves the page.
      placeElementBefore(main, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
      this.syncBody(hasContent)
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
   * The page heading.
   * @returns The translated heading.
   */
  titleText(): string {
    return this.i18n.t(
      this.titleKey ?? 'terms.title',
      {},
      {
        defaultValue: this.titleDefault ?? 'Terms',
      },
    )
  }

  /**
   * The boilerplate intro.
   * @returns The translated intro.
   */
  introText(): string {
    return this.i18n.t(
      this.introKey ?? 'terms.intro',
      {},
      {
        defaultValue:
          this.introDefault ??
          'This is the Terms page. Replace this placeholder with real content.',
      },
    )
  }

  /**
   * React's `{children ?? <p>{intro}</p>}`: keeps the intro paragraph when
   * nothing was projected, and renders the projected body unwrapped in its
   * place when something was.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private syncBody(hasContent: SlotReader): void {
    const intro = this.introEl?.nativeElement
    const slot = this.contentSlot?.nativeElement
    if (!intro || !slot) return
    const live = (slot.parentNode ?? intro.parentNode) as HTMLElement | null
    if (live !== null) this.bodyParent = live
    const parent = this.bodyParent
    if (!parent) return
    const next: 'intro' | 'content' = hasContent(slot) ? 'content' : 'intro'
    if (next === this.bodyMode) return
    if (next === 'content') {
      setElementPresent(intro, false)
      setElementPresent(slot, true)
      placeContent(slot, parent, slot)
      setElementPresent(slot, false)
    } else {
      placeContent(slot, null)
      setElementPresent(slot, false)
      setElementPresent(intro, true)
    }
    this.bodyMode = next
  }
}
