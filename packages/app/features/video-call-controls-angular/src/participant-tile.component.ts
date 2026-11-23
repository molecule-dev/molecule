/**
 * ParticipantTile component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContent,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/** The centered media layer's inline style, exactly as React writes it. */
const CENTER_STYLE =
  'position: absolute; inset: 0px; display: flex; align-items: center; justify-content: center'

/** The name badge's inline style, exactly as React writes it. */
const BADGE_STYLE =
  'position: absolute; left: 8px; bottom: 8px; padding: 2px 6px; border-radius: 4px; font-size: 12px'

/** The indicators row's inline style, exactly as React writes it. */
const INDICATORS_STYLE = 'position: absolute; right: 8px; bottom: 8px; display: flex; gap: 6px'

/** One indicator glyph's inline style, exactly as React writes it. */
const ICON_STYLE = 'font-size: 12px'

/**
 * ParticipantTile component.
 *
 * Single participant tile for a video grid. Apps supply the video element via
 * the `[slot=videoSlot]` projection; this component renders the surrounding
 * chrome (name badge, mute indicator, hand-raised, speaking ring).
 *
 * The host IS the outer `<div>` (`div[mol-participant-tile]`), matching React's
 * root exactly. Tiles are fixed 16:9 theme surfaces (`cm.surface` background,
 * theme ink) with a scrim name badge (`cm.bgScrim`, inverse text) and a
 * success-tone speaking ring (`cm.textTone('success')` ink, `currentColor`
 * outline).
 *
 * Angular projection needs the `<ng-content>` capture points mounted, so the
 * media layer renders two hidden capture spans whose content the placement
 * function places into the centered layer and then removes — React renders
 * `videoSlot ?? avatarSlot` directly, with no wrapper element.
 */
@Component({
  selector: 'div[mol-participant-tile]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [],
  inputs: ['name', 'audioEnabled', 'handRaised', 'speaking', 'isLocal', 'className'],
  host: {
    '[class]': 'classes()',
    '[style]': 'rootStyleText()',
  },
  // prettier-ignore
  template: `<div #center [style]="centerStyle"><span #videoCapture><ng-content select="[slot=videoSlot]"></ng-content></span><span #avatarCapture><ng-content select="[slot=avatarSlot]"></ng-content></span></div><div [class]="badgeClasses()" [style]="badgeStyle">@if (hasName) {<ng-container>{{ name }}</ng-container>}<ng-content select="[slot=name]" />@if (isLocal) {<ng-container>{{ youSuffix() }}</ng-container>}</div><div [style]="indicatorsStyle">@if (!audioOn()) {<span [attr.aria-label]="mutedLabel()" [style]="iconStyle">🔇</span>}@if (handRaised) {<span [attr.aria-label]="handRaisedLabel()" [style]="iconStyle">✋</span>}</div>`,
})
export class ParticipantTile {
  /** Participant display name (a string input; projected `[slot=name]` content supersedes it). */
  name?: unknown
  /** Audio enabled (React's default: true, applied at read time). */
  audioEnabled?: boolean
  /** Hand-raised indicator. */
  handRaised?: boolean
  /** Whether this participant is currently speaking. */
  speaking?: boolean
  /** Whether this is the local user. */
  isLocal?: boolean
  /** Extra classes on the tile wrapper. */
  className?: string

  /** The centered media layer the projected media nodes move into. */
  @ViewChild('center') private center?: ElementRef<HTMLDivElement>
  /** The hidden capture span for the video slot. */
  @ViewChild('videoCapture') private videoCapture?: ElementRef<HTMLSpanElement>
  /** The hidden capture span for the avatar fallback. */
  @ViewChild('avatarCapture') private avatarCapture?: ElementRef<HTMLSpanElement>

  /** The centered media layer's inline style. */
  readonly centerStyle = CENTER_STYLE
  /** The name badge's inline style. */
  readonly badgeStyle = BADGE_STYLE
  /** The indicators row's inline style. */
  readonly indicatorsStyle = INDICATORS_STYLE
  /** One indicator glyph's inline style. */
  readonly iconStyle = ICON_STYLE

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the labels re-render on a locale switch (the static `t` does not).
   */
  private readonly i18n = useTranslation()

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * The muted indicator's screen-reader label (React's `t('call.aria.muted')`).
   * @returns The label text.
   */
  mutedLabel(): string {
    return this.i18n.t('call.aria.muted', {}, { defaultValue: 'Muted' })
  }

  /**
   * The hand-raised indicator's screen-reader label (React's
   * `t('call.aria.handRaised')`).
   * @returns The label text.
   */
  handRaisedLabel(): string {
    return this.i18n.t('call.aria.handRaised', {}, { defaultValue: 'Hand raised' })
  }

  /**
   * React's `' (you)'` suffix for the local participant (with the leading space
   * React renders).
   * @returns The suffix text.
   */
  youSuffix(): string {
    return ` ${this.i18n.t('call.label.you', {}, { defaultValue: '(you)' })}`
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the tile class list (React's
   * `cm.cn(cm.position('relative'), cm.surface, speaking ? cm.textTone('success') : undefined, className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().position('relative'),
      this.cm().surface,
      this.speaking ? this.cm().textTone('success') : undefined,
      this.className,
    )
  }

  /**
   * The name badge's classes (React's `cm.cn(cm.bgScrim, cm.textOnTone)`).
   * @returns The class string.
   */
  badgeClasses(): string {
    return this.cm().cn(this.cm().bgScrim, this.cm().textOnTone)
  }

  /**
   * The root's inline style, exactly as React writes it (with the speaking
   * ring when `speaking`; the ring's colour rides the `cm.textTone('success')`
   * class through `currentColor`).
   * @returns The `style` attribute text.
   */
  rootStyleText(): string {
    const parts = ['aspect-ratio: 16 / 9', 'border-radius: 8px', 'overflow: hidden']
    if (this.speaking) parts.push('outline: 3px solid currentColor')
    return parts.join('; ')
  }

  /**
   * Whether the name renders as text (React's `{name}` for a string input).
   * @returns True when the name input is set.
   */
  get hasName(): boolean {
    return this.name !== undefined && this.name !== null
  }

  /**
   * Whether audio is on (React's `audioEnabled = true` default).
   * @returns True when the participant is not muted.
   */
  audioOn(): boolean {
    return this.audioEnabled ?? true
  }

  /**
   * Places the projected media into the centered layer — React renders
   * `videoSlot ?? avatarSlot` there directly, so the winning capture span's
   * content is rendered bare, the other slot's content is withheld inside its
   * capture, and both capture spans are taken out of the DOM.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const center = this.center?.nativeElement
    const video = this.videoCapture?.nativeElement
    const avatar = this.avatarCapture?.nativeElement
    if (!center || !video || !avatar) return
    const videoHas = hasContent(video)
    const winner = videoHas ? video : avatar
    const loser = videoHas ? avatar : video
    placeContent(loser, null)
    placeContent(winner, center, video)
    setElementPresent(video, false)
    setElementPresent(avatar, false)
  }
}
