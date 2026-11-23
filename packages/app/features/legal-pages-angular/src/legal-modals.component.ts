/**
 * LegalModals component (React parity): the two in-place Privacy / Terms
 * modals `useLegalModals()` returns, rendered from the api's open state.
 *
 * @module
 */

import { Component, ElementRef, inject } from '@angular/core'
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-angular'

import { escapeHtml } from './escape-html.js'
import type { LegalModalsApi } from './types.js'

/** Most cached trusted-HTML values kept at once (the two documents need two; the cap bounds misuse). */
const TRUSTED_CACHE_LIMIT = 8

/**
 * LegalModals component.
 *
 * React's `useLegalModals().modals` is a fragment of two `<Modal>` elements
 * portaled into `document.body`; an Angular template cannot render a component
 * class held in a value, so the pair ships as this component and the hook names
 * it. React's root is a FRAGMENT here (the modals portal into the body and the
 * host renders no element of its own), so the two modal elements render in the
 * host's place and the host itself never appears in the page.
 *
 * The legal HTML renders through a sanitizer-bypassed `[innerHTML]` — React's
 * `dangerouslySetInnerHTML` trust model for app-supplied catalog content — with
 * the `appName` HTML-escaped first.
 */
@Component({
  selector: 'mol-legal-modals',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Modal],
  inputs: ['api'],
  template: `<mol-modal
      [open]="api.state.privacyOpen()"
      [title]="privacyTitle()"
      [size]="'lg'"
      (close)="closePrivacy()"
    >
      <div [class]="cm().cn(cm().prose)" [innerHTML]="trustedPrivacyHtml()"></div>
    </mol-modal>
    <mol-modal
      [open]="api.state.termsOpen()"
      [title]="termsTitle()"
      [size]="'lg'"
      (close)="closeTerms()"
    >
      <div [class]="cm().cn(cm().prose)" [innerHTML]="trustedTermsHtml()"></div>
    </mol-modal>`,
})
export class LegalModals {
  /** The api `useLegalModals()` returned (its open state and, through it, the app name). */
  api!: LegalModalsApi

  /** The reactive i18n binding, read in the injection context. */
  private readonly i18n = useTranslation()

  /** The DOM sanitizer whose bypass keeps the legal HTML byte-identical to React's. */
  private readonly sanitizer = inject(DomSanitizer)

  /** Trusted-HTML values by source string. */
  private readonly trusted = new Map<string, SafeHtml>()

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    usePlacement(() => {
      // The two portaled modals render in the host's place; the host itself leaves.
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
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
   * The privacy modal's title.
   * @returns The translated title.
   */
  privacyTitle(): string {
    return this.i18n.t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })
  }

  /**
   * The terms modal's title.
   * @returns The translated title.
   */
  termsTitle(): string {
    return this.i18n.t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })
  }

  /**
   * The privacy body's HTML, the app name escaped.
   * @returns The HTML string.
   */
  privacyHtml(): string {
    const appName = this.api.state.appName
    return this.i18n.t('content.privacyPolicy', appName ? { appName: escapeHtml(appName) } : {}, {
      defaultValue: '',
    })
  }

  /**
   * The terms body's HTML, the app name escaped.
   * @returns The HTML string.
   */
  termsHtml(): string {
    const appName = this.api.state.appName
    return this.i18n.t('content.termsOfService', appName ? { appName: escapeHtml(appName) } : {}, {
      defaultValue: '',
    })
  }

  /**
   * Marks the privacy HTML as safe for the `[innerHTML]` binding.
   * @returns The trusted value for `[innerHTML]`.
   */
  trustedPrivacyHtml(): SafeHtml {
    return this.trustedValue(this.privacyHtml())
  }

  /**
   * Marks the terms HTML as safe for the `[innerHTML]` binding.
   * @returns The trusted value for `[innerHTML]`.
   */
  trustedTermsHtml(): SafeHtml {
    return this.trustedValue(this.termsHtml())
  }

  /** Closes the privacy modal (React's `onClose`). */
  closePrivacy(): void {
    this.api.state.privacyOpen.set(false)
  }

  /** Closes the terms modal (React's `onClose`). */
  closeTerms(): void {
    this.api.state.termsOpen.set(false)
  }

  /**
   * Memoizes the sanitizer bypass by HTML string.
   *
   * @param html - The raw legal HTML.
   * @returns The trusted value for `[innerHTML]`.
   */
  private trustedValue(html: string): SafeHtml {
    const hit = this.trusted.get(html)
    if (hit !== undefined) return hit
    if (this.trusted.size >= TRUSTED_CACHE_LIMIT) this.trusted.clear()
    const value = this.sanitizer.bypassSecurityTrustHtml(html)
    this.trusted.set(html, value)
    return value
  }
}
