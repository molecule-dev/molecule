/**
 * LegalModalLinks component (React parity): Privacy/Terms triggers that open
 * in-place modals instead of navigating.
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  type OnInit,
  type Renderer2,
  RendererFactory2,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { LegalModals } from './legal-modals.component.js'
import { useLegalModals } from './legal-modals.js'
import { applyNodeLayout, hasNodes } from './slot-dom.js'
import type { LegalModalsApi } from './types.js'

/**
 * LegalModalLinks component.
 *
 * Drop-in Privacy/Terms links that open IN-PLACE modals instead of navigating
 * — for bespoke footers and signup pages. React's root is a FRAGMENT (the
 * trigger buttons plus the two portaled modals), so the host is unwrapped
 * (`data-parity-unwrap`, `display: contents`) and renders exactly React's
 * sibling list.
 *
 * The labels are projected content (`[slot=privacyLabel]`, `[slot=termsLabel]`)
 * with the translated text as the fallback; {@link LegalModalLinks.ngDoCheck}
 * unwraps whichever of the two React would have rendered.
 */
@Component({
  selector: 'mol-legal-modal-links',
  standalone: true,
  imports: [LegalModals],
  inputs: ['linkClassName', 'show', 'privacyLabel', 'termsLabel', 'appName', 'loadContent'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `@if (showsPrivacy()) {<button type="button" [class]="linkClassName ?? null" (click)="openPrivacy()"><span #privacyFallback>{{ privacyText() }}</span><span #privacySlot><ng-content select="[slot=privacyLabel]"></ng-content></span></button>}@if (showsTerms()) {<button type="button" [class]="linkClassName ?? null" (click)="openTerms()"><span #termsFallback>{{ termsText() }}</span><span #termsSlot><ng-content select="[slot=termsLabel]"></ng-content></span></button>}<mol-legal-modals [api]="api"></mol-legal-modals>`,
})
export class LegalModalLinks implements OnInit, AfterViewInit, DoCheck {
  /** className applied to each trigger `<button>`. */
  linkClassName?: string
  /** Which links to render (`'both'` when unset). */
  show?: 'both' | 'privacy' | 'terms'
  /** Override the Privacy label (projected `[slot=privacyLabel]` content). */
  privacyLabel?: unknown
  /** Override the Terms label (projected `[slot=termsLabel]` content). */
  termsLabel?: unknown
  /** App name interpolated into the privacy AND terms bodies. */
  appName?: string
  /** Lazy-loader for the legal HTML, run right before a modal opens. */
  loadContent?: (key: 'privacyPolicy' | 'termsOfService') => Promise<void> | void

  /** The privacy label's text capture point. */
  @ViewChild('privacyFallback') private privacyFallback?: ElementRef<HTMLElement>
  /** The privacy label's projected-nodes capture point. */
  @ViewChild('privacySlot') private privacySlot?: ElementRef<HTMLElement>
  /** The terms label's text capture point. */
  @ViewChild('termsFallback') private termsFallback?: ElementRef<HTMLElement>
  /** The terms label's projected-nodes capture point. */
  @ViewChild('termsSlot') private termsSlot?: ElementRef<HTMLElement>

  /** Whether the privacy label receives projected nodes (read at view init). */
  private hasPrivacySlot = false
  /** Whether the terms label receives projected nodes (read at view init). */
  private hasTermsSlot = false

  private readonly host = inject(ElementRef<HTMLElement>)
  private readonly renderer: Renderer2 = inject(RendererFactory2).createRenderer(null, null)

  /** The reactive i18n binding, read in the injection context. */
  private readonly i18n = useTranslation()

  /**
   * The hook's api: the openers, the open state and the modals component.
   * React calls `useLegalModals(opts)` on every render; the options are the
   * props as they are when the component is created — created in
   * `ngOnInit`, because Angular assigns inputs AFTER the field initializers.
   */
  api!: LegalModalsApi

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Whether the privacy trigger renders (React's `show !== 'terms'`).
   * @returns True when it renders.
   */
  showsPrivacy(): boolean {
    return (this.show ?? 'both') !== 'terms'
  }

  /**
   * Whether the terms trigger renders (React's `show !== 'privacy'`).
   * @returns True when it renders.
   */
  showsTerms(): boolean {
    return (this.show ?? 'both') !== 'privacy'
  }

  /**
   * The privacy label's fallback text.
   * @returns The translated label.
   */
  privacyText(): string {
    return this.i18n.t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })
  }

  /**
   * The terms label's fallback text.
   * @returns The translated label.
   */
  termsText(): string {
    return this.i18n.t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })
  }

  /** Opens the privacy modal (React's `openPrivacy`). */
  openPrivacy(): void {
    void this.api.openPrivacy()
  }

  /** Opens the terms modal (React's `openTerms`). */
  openTerms(): void {
    void this.api.openTerms()
  }

  /** Creates the hook's api once the inputs exist. */
  ngOnInit(): void {
    this.api = useLegalModals({
      appName: this.appName,
      loadContent: this.loadContent,
    })
  }

  /**
   * Reads which labels received projected nodes (the queries resolve only at
   * view init) and applies the first layout pass.
   */
  ngAfterViewInit(): void {
    this.hasPrivacySlot = hasNodes(this.privacySlot?.nativeElement)
    this.hasTermsSlot = hasNodes(this.termsSlot?.nativeElement)
    this.syncLabels()
  }

  /** Re-applies the label layout after projected-content changes. */
  ngDoCheck(): void {
    this.syncLabels()
  }

  /** Unwraps whichever of each label's two capture points React would render. */
  private syncLabels(): void {
    applyNodeLayout(
      this.privacyFallback?.nativeElement,
      this.privacySlot?.nativeElement,
      this.hasPrivacySlot,
    )
    applyNodeLayout(
      this.termsFallback?.nativeElement,
      this.termsSlot?.nativeElement,
      this.hasTermsSlot,
    )
  }
}
