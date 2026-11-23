/**
 * LegalModalLinks component (React parity): Privacy/Terms triggers that open
 * in-place modals instead of navigating.
 *
 * @module
 */

import { Component, ElementRef, inject, type OnInit, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContent,
  placeContentBefore,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { LegalModals } from './legal-modals.component.js'
import { useLegalModals } from './legal-modals.js'
import type { LegalModalsApi } from './types.js'

/**
 * LegalModalLinks component.
 *
 * Drop-in Privacy/Terms links that open IN-PLACE modals instead of navigating
 * — for bespoke footers and signup pages. React's root is a FRAGMENT (the
 * trigger buttons plus the two portaled modals), so those elements render in
 * the host's place and the host itself never appears in the page.
 *
 * The labels are projected content (`[slot=privacyLabel]`, `[slot=termsLabel]`)
 * with the translated text as the fallback; {@link LegalModalLinks.syncLabels}
 * unwraps whichever of the two React would have rendered.
 */
@Component({
  selector: 'mol-legal-modal-links',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [LegalModals],
  inputs: ['linkClassName', 'show', 'privacyLabel', 'termsLabel', 'appName', 'loadContent'],
  // prettier-ignore
  template: `@if (showsPrivacy()) {<button type="button" [class]="linkClassName ?? null" (click)="openPrivacy()"><span #privacyFallback>{{ privacyText() }}</span><span #privacySlot><ng-content select="[slot=privacyLabel]"></ng-content></span></button>}@if (showsTerms()) {<button type="button" [class]="linkClassName ?? null" (click)="openTerms()"><span #termsFallback>{{ termsText() }}</span><span #termsSlot><ng-content select="[slot=termsLabel]"></ng-content></span></button>}<mol-legal-modals [api]="api"></mol-legal-modals>`,
})
export class LegalModalLinks implements OnInit {
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

  /** How one label renders: which form, where it renders, and the capture it was planned for. */
  private readonly privacyLabelState: {
    mode: 'text' | 'nodes' | null
    parent: HTMLElement | null
    slot: HTMLElement | null
  } = { mode: null, parent: null, slot: null }
  /** How the terms label renders (see {@link privacyLabelState}). */
  private readonly termsLabelState: {
    mode: 'text' | 'nodes' | null
    parent: HTMLElement | null
    slot: HTMLElement | null
  } = { mode: null, parent: null, slot: null }

  /** The reactive i18n binding, read in the injection context. */
  private readonly i18n = useTranslation()

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    usePlacement((hasContent) => {
      // The trigger buttons and the portaled modals render in the host's
      // place, in template order; the host itself leaves the page.
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
      this.syncLabels(hasContent)
    })
  }

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
   * Unwraps whichever of each label's two capture points React would render.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private syncLabels(hasContent: SlotReader): void {
    this.syncLabel(
      this.privacyFallback?.nativeElement,
      this.privacySlot?.nativeElement,
      this.privacyLabelState,
      hasContent,
    )
    this.syncLabel(
      this.termsFallback?.nativeElement,
      this.termsSlot?.nativeElement,
      this.termsLabelState,
      hasContent,
    )
  }

  /**
   * React renders either the plain text or the projected nodes, unwrapped
   * inside the trigger — never one of the two capture spans. The projected
   * nodes win when the label received any; the text is the fallback otherwise.
   * The trigger stays the same element while it renders, so the parent is kept
   * once seen (a detached capture point has no parent).
   *
   * @param fallback - The span holding the plain text.
   * @param slot - The span holding the projected nodes.
   * @param label - The form rendered last time and the element it rendered in.
   * @param hasContent - Reads whether a slot has content.
   */
  private syncLabel(
    fallback: HTMLElement | undefined,
    slot: HTMLElement | undefined,
    label: { mode: 'text' | 'nodes' | null; parent: HTMLElement | null; slot: HTMLElement | null },
    hasContent: SlotReader,
  ): void {
    if (!fallback || !slot) return
    // A re-created trigger (a `show` change) is planned again from scratch.
    if (label.slot !== slot) {
      label.slot = slot
      label.mode = null
    }
    const live = (fallback.parentNode ?? slot.parentNode) as HTMLElement | null
    if (live !== null) label.parent = live
    const parent = label.parent
    if (!parent) return
    const next: 'text' | 'nodes' = hasContent(slot) ? 'nodes' : 'text'
    if (next === label.mode) return
    if (next === 'nodes') {
      placeContent(fallback, null)
      setElementPresent(fallback, false)
      setElementPresent(slot, true)
      placeContent(slot, parent, slot)
      setElementPresent(slot, false)
    } else {
      placeContent(slot, null)
      setElementPresent(slot, false)
      setElementPresent(fallback, true)
      placeContent(fallback, parent, fallback)
      setElementPresent(fallback, false)
    }
    label.mode = next
  }
}
