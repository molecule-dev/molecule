/**
 * TransportBar component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, ElementRef, inject, signal, type TemplateRef, ViewChild } from '@angular/core'

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

/**
 * Whether a field is one of the cases' projected node templates (a `{ $nodes }`
 * value inside a prop becomes a `TemplateRef`).
 *
 * @param value - The field value.
 * @returns True for a projected node template.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' && value !== null && 'createEmbeddedView' in value

/**
 * Transport-control bar (play / pause / stop / record / skip / loop) used by
 * music-daw + video-editor surfaces for editor playback control. Renders a
 * horizontal bar of buttons with semantic icons and fully translated
 * `aria-label`s; an optional time-display slot lets callers render the current
 * playhead position / total duration without coupling the bar to any specific
 * time-format library.
 *
 * The host IS the outer `<div>` (`div[mol-transport-bar]`), matching React's
 * root exactly. Every button renders only while React would render it (a
 * missing handler renders no button, `canStop` / `canSkip` only disable one),
 * and the time-display wrapper renders only while React's `{slot && …}` would
 * render it — the Angular projection capture points must stay mounted, so the
 * placement function decides the wrapper's presence and withholds it with
 * `setElementPresent` instead.
 */
@Component({
  selector: 'div[mol-transport-bar]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [NgTemplateOutlet],
  inputs: [
    'isPlaying',
    'isRecording',
    'canStop',
    'canSkip',
    'loop',
    'onPlayToggle',
    'onStop',
    'onSkipBack',
    'onSkipForward',
    'onRecordToggle',
    'onLoopToggle',
    'timeDisplay',
    'className',
  ],
  host: {
    role: 'toolbar',
    'data-mol-id': 'transport-bar',
    '[attr.aria-label]': 'regionLabel()',
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `@if (onSkipBack) {<button type="button" (click)="callSkipBack($event)" [disabled]="!canSkipValue()" [attr.aria-label]="skipBackLabel()" data-mol-id="transport-bar-skip-back" [class]="controlClasses()" [style.background]="'transparent'" [style.border]="'none'" [style.cursor]="'pointer'" [style.padding]="0"><span aria-hidden="true">⏮</span></button>}<button type="button" (click)="callPlayToggle($event)" [attr.aria-label]="isPlaying ? pauseLabel() : playLabel()" [attr.aria-pressed]="isPlaying" [attr.data-state]="isPlaying ? 'playing' : 'paused'" data-mol-id="transport-bar-play-toggle" [class]="controlClasses()" [style.background]="'transparent'" [style.border]="'none'" [style.cursor]="'pointer'" [style.padding]="0"><span aria-hidden="true">{{ isPlaying ? '⏸' : '▶' }}</span></button><button type="button" (click)="callStop($event)" [disabled]="!canStopValue()" [attr.aria-label]="stopLabel()" data-mol-id="transport-bar-stop" [class]="controlClasses()" [style.background]="'transparent'" [style.border]="'none'" [style.cursor]="'pointer'" [style.padding]="0"><span aria-hidden="true">⏹</span></button>@if (onSkipForward) {<button type="button" (click)="callSkipForward($event)" [disabled]="!canSkipValue()" [attr.aria-label]="skipForwardLabel()" data-mol-id="transport-bar-skip-forward" [class]="controlClasses()" [style.background]="'transparent'" [style.border]="'none'" [style.cursor]="'pointer'" [style.padding]="0"><span aria-hidden="true">⏭</span></button>}@if (onRecordToggle) {<button type="button" (click)="callRecordToggle($event)" [attr.aria-label]="isRecording ? stopRecordingLabel() : recordLabel()" [attr.aria-pressed]="!!isRecording" [attr.data-state]="isRecording ? 'recording' : 'idle'" data-mol-id="transport-bar-record-toggle" [class]="controlClasses()" [style.background]="'transparent'" [style.border]="'none'" [style.cursor]="'pointer'" [style.padding]="0"><span aria-hidden="true">●</span></button>}@if (onLoopToggle) {<button type="button" (click)="callLoopToggle($event)" [attr.aria-label]="loop ? loopOnLabel() : loopOffLabel()" [attr.aria-pressed]="!!loop" [attr.data-state]="loop ? 'on' : 'off'" data-mol-id="transport-bar-loop-toggle" [class]="controlClasses()" [style.background]="'transparent'" [style.border]="'none'" [style.cursor]="'pointer'" [style.padding]="0"><span aria-hidden="true">↻</span></button>}<div #timeSlot data-mol-id="transport-bar-time-display" [class]="timeClasses()"><span #childSlot><ng-content></ng-content></span><span #namedSlot><ng-content select="[slot=timeDisplay]"></ng-content></span>@if (isTemplate(timeDisplay)) {<ng-container [ngTemplateOutlet]="asTemplate(timeDisplay)" />}@if (timeDisplayText()) {{{ timeDisplayText() }}}</div>@if (falsySlotText()) {{{ falsySlotText() }}}`,
})
export class TransportBar {
  /** Whether playback is currently running. */
  isPlaying?: boolean
  /** Whether recording is currently armed / running. */
  isRecording?: boolean
  /** Whether the stop button is enabled (defaults to `true` at read time). */
  canStop?: boolean
  /** Whether the skip buttons are enabled (defaults to `true` at read time). */
  canSkip?: boolean
  /** Whether loop playback is currently engaged. */
  loop?: boolean
  /** Toggle play / pause. */
  onPlayToggle?: (event: Event) => void
  /** Stop playback. */
  onStop?: (event: Event) => void
  /** Skip to the previous marker / start of clip. */
  onSkipBack?: (event: Event) => void
  /** Skip to the next marker / end of clip. */
  onSkipForward?: (event: Event) => void
  /** Toggle record mode. */
  onRecordToggle?: (event: Event) => void
  /** Toggle loop mode. */
  onLoopToggle?: (event: Event) => void
  /** Optional time-display slot: projected `[slot=timeDisplay]`, a `TemplateRef`, or text. */
  timeDisplay?: unknown
  /** Extra classes merged onto the root element. */
  className?: string

  /** The time-display wrapper (always in the template; detached when React renders none). */
  @ViewChild('timeSlot') timeSlotRef?: ElementRef<HTMLElement>
  /** The default content's capture point (its nodes are unwrapped when React shows them). */
  @ViewChild('childSlot') childSlotRef?: ElementRef<HTMLElement>
  /** The `[slot=timeDisplay]` content's capture point. */
  @ViewChild('namedSlot') namedSlotRef?: ElementRef<HTMLElement>

  private readonly i18n = useTranslation()
  private readonly host: HTMLElement = inject(ElementRef).nativeElement

  /** Whether `children` content was projected. */
  private readonly childProjected = signal(false)
  /** Whether `[slot=timeDisplay]` content was projected. */
  private readonly namedProjected = signal(false)
  /** The capture wrapper whose content is currently rendered in the time region. */
  private placed: HTMLElement | null = null

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the root class list (React's `cm.cn(cm.flex({…}), cm.sp('p', 2), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().sp('p', 2),
      this.className,
    )
  }

  /**
   * Computes every control's class list (React's `cm.cn(cm.cursorPointer, cm.sp('p', 1))`).
   * @returns The class string.
   */
  controlClasses(): string {
    return this.cm().cn(this.cm().cursorPointer, this.cm().sp('p', 1))
  }

  /**
   * Computes the time-display wrapper's class list (React's `cm.cn(cm.textSize('sm'), cm.sp('px', 2))`).
   * @returns The class string.
   */
  timeClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().sp('px', 2))
  }

  /**
   * The toolbar's accessible name (React's `transportBar.aria.region`).
   * @returns The label text.
   */
  regionLabel(): string {
    return this.i18n.t(
      'transportBar.aria.region',
      {},
      { defaultValue: 'Playback transport controls' },
    )
  }

  /**
   * The skip-back button's accessible name.
   * @returns The label text.
   */
  skipBackLabel(): string {
    return this.i18n.t('transportBar.aria.skipBack', {}, { defaultValue: 'Skip backward' })
  }

  /**
   * The skip-forward button's accessible name.
   * @returns The label text.
   */
  skipForwardLabel(): string {
    return this.i18n.t('transportBar.aria.skipForward', {}, { defaultValue: 'Skip forward' })
  }

  /**
   * The play button's accessible name.
   * @returns The label text.
   */
  playLabel(): string {
    return this.i18n.t('transportBar.aria.play', {}, { defaultValue: 'Play' })
  }

  /**
   * The pause button's accessible name.
   * @returns The label text.
   */
  pauseLabel(): string {
    return this.i18n.t('transportBar.aria.pause', {}, { defaultValue: 'Pause' })
  }

  /**
   * The stop button's accessible name.
   * @returns The label text.
   */
  stopLabel(): string {
    return this.i18n.t('transportBar.aria.stop', {}, { defaultValue: 'Stop' })
  }

  /**
   * The record button's accessible name while idle.
   * @returns The label text.
   */
  recordLabel(): string {
    return this.i18n.t('transportBar.aria.record', {}, { defaultValue: 'Record' })
  }

  /**
   * The record button's accessible name while recording.
   * @returns The label text.
   */
  stopRecordingLabel(): string {
    return this.i18n.t('transportBar.aria.stopRecording', {}, { defaultValue: 'Stop recording' })
  }

  /**
   * The loop button's accessible name while engaged.
   * @returns The label text.
   */
  loopOnLabel(): string {
    return this.i18n.t('transportBar.aria.loopOn', {}, { defaultValue: 'Disable loop' })
  }

  /**
   * The loop button's accessible name while disengaged.
   * @returns The label text.
   */
  loopOffLabel(): string {
    return this.i18n.t('transportBar.aria.loopOff', {}, { defaultValue: 'Enable loop' })
  }

  /**
   * React's `canStop = true` default parameter.
   * @returns Whether the stop button is enabled.
   */
  canStopValue(): boolean {
    return this.canStop ?? true
  }

  /**
   * React's `canSkip = true` default parameter.
   * @returns Whether the skip buttons are enabled.
   */
  canSkipValue(): boolean {
    return this.canSkip ?? true
  }

  /**
   * React's `timeDisplay ?? children` truthiness: whether the time-display
   * wrapper renders.
   * @returns True when the wrapper (and not the bare falsy value) renders.
   */
  slotPresent(): boolean {
    return this.namedPresent() || this.childProjected()
  }

  /**
   * Whether React's `timeDisplay` slot is provided at all: the input (a
   * template, text or number) or projected `[slot=timeDisplay]` content.
   * @returns True when the named slot wins over the default content.
   */
  namedPresent(): boolean {
    return this.timeDisplayPresent() || this.namedProjected()
  }

  /**
   * Whether a value is a projected node template.
   * @param value - The field value.
   * @returns True for a projected node template.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return isTemplate(value)
  }

  /**
   * The value as a template (call under {@link TransportBar.isTemplate}).
   * @param value - The field value.
   * @returns The template.
   */
  asTemplate(value: unknown): TemplateRef<unknown> {
    return value as TemplateRef<unknown>
  }

  /**
   * The `timeDisplay` input's text (a string or number renders as text, as
   * React renders it inside the wrapper).
   * @returns The text, or `''` when the input is a node or absent.
   */
  timeDisplayText(): string {
    const value = this.timeDisplay
    if (typeof value === 'string') return value
    if (typeof value === 'number' && value !== 0 && !Number.isNaN(value)) return String(value)
    return ''
  }

  /**
   * React's `{slot && …}` yields the falsy value itself, and React renders a
   * number there (`0` shows as the text "0"); an empty string, `false`, `null`
   * and `undefined` render nothing.
   * @returns The text React renders beside the controls, or `''`.
   */
  falsySlotText(): string {
    if (this.slotPresent()) return ''
    return typeof this.timeDisplay === 'number' ? String(this.timeDisplay) : ''
  }

  /** Toggles play / pause (React's `onClick={onPlayToggle}`). */
  callPlayToggle(event: Event): void {
    this.onPlayToggle?.(event)
  }

  /** Stops playback (React's `onClick={onStop}`). */
  callStop(event: Event): void {
    this.onStop?.(event)
  }

  /** Skips backward (React's conditional skip button). */
  callSkipBack(event: Event): void {
    this.onSkipBack?.(event)
  }

  /** Skips forward (React's conditional skip button). */
  callSkipForward(event: Event): void {
    this.onSkipForward?.(event)
  }

  /** Toggles record mode (React's conditional record button). */
  callRecordToggle(event: Event): void {
    this.onRecordToggle?.(event)
  }

  /** Toggles loop mode (React's conditional loop button). */
  callLoopToggle(event: Event): void {
    this.onLoopToggle?.(event)
  }

  /**
   * Whether the `timeDisplay` input alone makes React render the wrapper.
   * @returns True for a template, a non-empty string, a non-zero number or `true`.
   */
  private timeDisplayPresent(): boolean {
    const value = this.timeDisplay
    if (isTemplate(value)) return true
    if (typeof value === 'number') return value !== 0 && !Number.isNaN(value)
    if (typeof value === 'string') return value !== ''
    return value === true
  }

  /**
   * Applies React's DOM for the time-display region: the wrapper renders only
   * while React renders it, and the winning projected slot is rendered bare
   * inside it.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const time = this.timeSlotRef?.nativeElement
    if (!time) return
    this.childProjected.set(hasContent(this.childSlotRef?.nativeElement))
    this.namedProjected.set(hasContent(this.namedSlotRef?.nativeElement))
    const present = this.namedPresent()
    const winner = present ? this.namedSlotRef?.nativeElement : this.childSlotRef?.nativeElement
    const loser = present ? this.childSlotRef?.nativeElement : this.namedSlotRef?.nativeElement
    this.withhold(loser)
    this.hoist(winner, time)
    setElementPresent(time, this.slotPresent())
  }

  /**
   * Renders a capture wrapper's content bare inside the time region (React
   * renders the slot with no wrapper element) and takes the wrapper out.
   * @param slot - The capture wrapper.
   * @param time - The time-display region.
   */
  private hoist(slot: HTMLElement | undefined, time: HTMLElement): void {
    if (!slot || this.placed === slot) return
    setElementPresent(slot, true)
    placeContent(slot, time, slot)
    setElementPresent(slot, false)
    this.placed = slot
  }

  /**
   * Puts a capture wrapper's content back inside it and keeps the wrapper out of
   * the DOM, the state React renders for the slot it did not choose.
   * @param slot - The capture wrapper.
   */
  private withhold(slot: HTMLElement | undefined): void {
    if (!slot) return
    placeContent(slot, null)
    setElementPresent(slot, false)
    if (this.placed === slot) this.placed = null
  }
}
