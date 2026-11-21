/**
 * PrivacyPage component (React parity): the default Privacy-policy page
 * scaffold.
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  type ElementRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { SpacingScale, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { LegalPageLayout } from './legal-page-layout.component.js'
import { hasNodes } from './slot-dom.js'

/**
 * PrivacyPage component.
 *
 * Default Privacy-policy page scaffold: the canonical boilerplate Privacy page,
 * or the projected body when the app supplies one. React's root is the layout's
 * `<main>`, so the host is unwrapped (`data-parity-unwrap`,
 * `display: contents`) and renders exactly React's `<main>`; the heading is
 * projected into `LegalPageLayout`'s `[slot=title]`.
 *
 * React renders the boilerplate intro paragraph only when no children were
 * passed and the projected body otherwise, so both capture points exist and
 * {@link PrivacyPage.ngDoCheck} keeps whichever React would have rendered.
 */
@Component({
  selector: 'mol-privacy-page',
  standalone: true,
  imports: [LegalPageLayout],
  inputs: ['titleKey', 'titleDefault', 'introKey', 'introDefault', 'stackGap'],
  host: { 'data-parity-unwrap': '', style: 'display: contents' },
  template: `<main mol-legal-page-layout [dataMolId]="'page-privacy'" [stackGap]="stackGap">
    <ng-container ngProjectAs="[slot=title]">{{ titleText() }}</ng-container>
    <p #introEl>{{ introText() }}</p>
    <span #contentSlot><ng-content></ng-content></span>
  </main>`,
})
export class PrivacyPage implements AfterViewInit, DoCheck {
  /** i18n key for the page heading (defaults to `privacy.title` at read time). */
  titleKey?: string
  /** Default for the heading when the key is missing (defaults to `Privacy`). */
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

  /** Whether the body received projected content (read at view init). */
  private hasContent = false

  /** The reactive i18n binding, read in the injection context. */
  private readonly i18n = useTranslation()

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
      this.titleKey ?? 'privacy.title',
      {},
      {
        defaultValue: this.titleDefault ?? 'Privacy',
      },
    )
  }

  /**
   * The boilerplate intro.
   * @returns The translated intro.
   */
  introText(): string {
    return this.i18n.t(
      this.introKey ?? 'privacy.intro',
      {},
      {
        defaultValue:
          this.introDefault ??
          'This is the Privacy page. Replace this placeholder with real content.',
      },
    )
  }

  /** Reads whether the body received projected content and applies the layout. */
  ngAfterViewInit(): void {
    this.hasContent = hasNodes(this.contentSlot?.nativeElement)
    this.syncBody()
  }

  /** Re-applies the body layout after projected-content changes. */
  ngDoCheck(): void {
    this.syncBody()
  }

  /**
   * React's `{children ?? <p>{intro}</p>}`: keeps the intro paragraph when
   * nothing was projected, and unwraps the projected body into its place when
   * something was.
   */
  private syncBody(): void {
    const intro = this.introEl?.nativeElement
    const slot = this.contentSlot?.nativeElement
    const parent = slot?.parentNode
    if (!intro || !slot || !parent) return
    if (!this.hasContent) {
      if (slot.isConnected) parent.removeChild(slot)
      return
    }
    if (intro.isConnected) parent.removeChild(intro)
    if (!slot.isConnected) return
    while (slot.firstChild) parent.insertBefore(slot.firstChild, slot)
    parent.removeChild(slot)
  }
}
