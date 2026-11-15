/**
 * FlashcardCard component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  type ElementRef,
  signal,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

import type { SrsGrade } from './types.js'

/**
 * Whether an ng-content wrapper captured any element or text node.
 *
 * @param el - The wrapper element.
 * @returns True when at least one projected node exists.
 */
const hasNodes = (el: Element | undefined | null): boolean => {
  if (!el) return false
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 1) return true
    if (node.nodeType === 3 && (node.textContent ?? '').trim()) return true
  }
  return false
}

/**
 * FlashcardCard component.
 *
 * Flashcard study component — front face → reveal back → SM-2 style grade
 * buttons (Again / Hard / Good / Easy). The host IS React's root `<div>`
 * (`div[mol-flashcard-card]`), carrying the `Card` classes exactly as React's
 * `Card` does. `front` / `back` / `progress` are projected content
 * (`[slot=front]`, `[slot=back]`, `[slot=progress]`) or plain string inputs;
 * the button labels go through `useTranslation()` with React's exact keys and
 * English defaults. Grading flips the card back to its front face.
 */
@Component({
  selector: 'div[mol-flashcard-card]',
  standalone: true,
  imports: [Button],
  inputs: ['front', 'back', 'progress', 'onGrade', 'defaultRevealed', 'className'],
  host: {
    '[class]': 'cardClasses()',
  },
  // prettier-ignore
  template: `<div [class]="stackClasses()"><div #progressWrap [class]="progressClasses()">@if (hasProgress) {<ng-container>{{ progress }}</ng-container>}<ng-content select="[slot=progress]"></ng-content></div><div [class]="faceClasses()" #face>@if (revealed()) {@if (hasBack) {<ng-container>{{ back }}</ng-container>}<ng-content select="[slot=back]"></ng-content>} @else {@if (hasFront) {<ng-container>{{ front }}</ng-container>}<ng-content select="[slot=front]"></ng-content>}</div>@if (!revealed()) {<button mol-button [variant]="'solid'" [color]="'primary'" (click)="reveal()">{{ revealLabel() }}</button>} @else {<div [class]="gridClasses()"><button mol-button [variant]="'outline'" [color]="'error'" (click)="grade('again')">{{ againLabel() }}</button><button mol-button [variant]="'outline'" [color]="'warning'" (click)="grade('hard')">{{ hardLabel() }}</button><button mol-button [variant]="'outline'" [color]="'primary'" (click)="grade('good')">{{ goodLabel() }}</button><button mol-button [variant]="'outline'" [color]="'success'" (click)="grade('easy')">{{ easyLabel() }}</button></div>}</div>`,
})
export class FlashcardCard implements AfterViewInit, DoCheck {
  /** Front content (prompt) — a string input, or `[slot=front]` projected content. */
  front?: unknown
  /** Back content (answer) — a string input, or `[slot=back]` projected content. */
  back?: unknown
  /** Optional progress / position — a string input, or `[slot=progress]` content. */
  progress?: unknown
  /** Called when the user grades the card after revealing the answer. */
  onGrade?: (grade: SrsGrade) => void
  /** Initially show the answer. Read once, like React's `useState`. */
  defaultRevealed?: boolean
  /** Extra classes on the card. */
  className?: string

  /** The progress wrapper (always in the template; detached when empty). */
  @ViewChild('progressWrap') private progressWrap?: ElementRef<HTMLDivElement>
  /** The face element the front/back content renders into. */
  @ViewChild('face') private face?: ElementRef<HTMLDivElement>

  /** The i18n provider above the card (the button labels). */
  private readonly i18n = useTranslation()

  /** Whether the answer face is showing. */
  private readonly revealedState = signal(false)

  /** Whether a `[slot=progress]` projection landed (an empty wrapper is removed). */
  private progressProjected = false

  /** Whether the view queries have been read (nothing is withdrawn before). */
  private viewReady = false

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the card class list — React's `Card` with the default
   * `elevated` variant and `md` padding, plus `className`.
   * @returns The class string.
   */
  cardClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.card({ variant: 'elevated' }), cm.cardPadding('md'), this.className)
  }

  /**
   * The outer stack class list.
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().stack(4)
  }

  /**
   * The progress row class list.
   * @returns The class string.
   */
  progressClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.textCenter)
  }

  /**
   * The face class list.
   * @returns The class string.
   */
  faceClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.sp('p', 6), cm.textCenter, cm.cn(cm.textSize('xl')))
  }

  /**
   * The grade-button grid class list.
   * @returns The class string.
   */
  gridClasses(): string {
    return this.cm().grid({ cols: 4, gap: 'sm' })
  }

  /**
   * Whether the answer face is showing.
   * @returns True when revealed.
   */
  revealed(): boolean {
    return this.revealedState()
  }

  /**
   * Whether the front arrives as a text input (projected content otherwise).
   * @returns True when `front` is a non-empty string.
   */
  get hasFront(): boolean {
    return typeof this.front === 'string' && this.front.length > 0
  }

  /**
   * Whether the back arrives as a text input (projected content otherwise).
   * @returns True when `back` is a non-empty string.
   */
  get hasBack(): boolean {
    return typeof this.back === 'string' && this.back.length > 0
  }

  /**
   * Whether the progress row renders at all — React's `{progress && …}`.
   * @returns True when a text or projected progress row exists.
   */
  get hasProgress(): boolean {
    return (typeof this.progress === 'string' && this.progress.length > 0) || this.progressProjected
  }

  /**
   * The reveal button's label.
   * @returns The translated text.
   */
  revealLabel(): string {
    return this.i18n.t('flashcard.reveal', {}, { defaultValue: 'Show answer' })
  }

  /**
   * The Again button's label.
   * @returns The translated text.
   */
  againLabel(): string {
    return this.i18n.t('flashcard.again', {}, { defaultValue: 'Again' })
  }

  /**
   * The Hard button's label.
   * @returns The translated text.
   */
  hardLabel(): string {
    return this.i18n.t('flashcard.hard', {}, { defaultValue: 'Hard' })
  }

  /**
   * The Good button's label.
   * @returns The translated text.
   */
  goodLabel(): string {
    return this.i18n.t('flashcard.good', {}, { defaultValue: 'Good' })
  }

  /**
   * The Easy button's label.
   * @returns The translated text.
   */
  easyLabel(): string {
    return this.i18n.t('flashcard.easy', {}, { defaultValue: 'Easy' })
  }

  /** Reveals the answer face. */
  reveal(): void {
    this.revealedState.set(true)
  }

  /**
   * Forwards the selected grade to the parent and resets the card to hidden.
   * @param grade - The selected SM-2 grade.
   */
  grade(grade: SrsGrade): void {
    this.onGrade?.(grade)
    this.revealedState.set(false)
  }

  /** Reads the initial `defaultRevealed` once — React's `useState` semantics. */
  ngOnInit(): void {
    this.revealedState.set(!!this.defaultRevealed)
  }

  /**
   * Reads whether a progress row was projected, then withdraws the wrapper
   * when neither a text input nor projected content landed (React renders no
   * wrapper at all in that case). View queries resolve only at view init.
   */
  ngAfterViewInit(): void {
    const wrap = this.progressWrap?.nativeElement
    if (wrap) this.progressProjected = hasNodes(wrap)
    this.viewReady = true
    this.withdrawEmptyProgress()
  }

  /**
   * Withdraws the progress wrapper once nothing fills it (React renders
   * `{progress && <div>…</div>}` — nothing when progress is absent).
   */
  ngDoCheck(): void {
    if (this.viewReady) this.withdrawEmptyProgress()
  }

  /** Detaches the progress row when neither a text nor a projected input fills it. */
  private withdrawEmptyProgress(): void {
    const wrap = this.progressWrap?.nativeElement
    if (!wrap || !wrap.isConnected || this.hasProgress) return
    wrap.remove()
  }
}
