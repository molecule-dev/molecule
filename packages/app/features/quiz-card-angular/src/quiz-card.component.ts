/**
 * QuizCard component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type ElementRef, signal, TemplateRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

import type { QuizOption } from './types.js'

/**
 * QuizCard component.
 *
 * Single quiz question card with multiple-choice options. The host IS React's
 * root `<div>` (`div[mol-quiz-card]`), carrying the `Card` classes exactly as
 * React's `Card` does. Tracks its own submit state and reveals
 * correct/incorrect when `correctId` is provided.
 *
 * The node-valued `question`, `progress`, `timer` and `explanation` props
 * arrive as projected content (`[slot=question]`, `[slot=progress]`,
 * `[slot=timer]`, `[slot=explanation]`), as embedded templates, or as plain
 * string inputs. A wrapper React would not render at all (the progress span,
 * the explanation paragraph) leaves the page and keeps its capture point, so
 * content a consumer projects later renders in it.
 */
@Component({
  selector: 'div[mol-quiz-card]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Button, NgTemplateOutlet],
  inputs: [
    'question',
    'options',
    'correctId',
    'onAnswer',
    'progress',
    'timer',
    'explanation',
    'className',
  ],
  host: {
    '[class]': 'cardClasses()',
  },
  // prettier-ignore
  template: `<div #stack [class]="stackClasses()"><header #header [class]="headerClasses()"><span #progressEl [class]="progressClasses()">@if (isText(progress)) {<ng-container>{{ progress }}</ng-container>}<ng-container [ngTemplateOutlet]="templateOf(progress)"></ng-container><ng-content select="[slot=progress]"></ng-content></span>@if (isText(timer)) {<ng-container>{{ timer }}</ng-container>}<ng-container [ngTemplateOutlet]="templateOf(timer)"></ng-container><ng-content select="[slot=timer]"></ng-content></header><h2 [class]="questionClasses()">@if (isText(question)) {<ng-container>{{ question }}</ng-container>}<ng-container [ngTemplateOutlet]="templateOf(question)"></ng-container><ng-content select="[slot=question]"></ng-content></h2><div [class]="optionsClasses()">@for (option of options; track option.id) {<button type="button" (click)="select(option)" [disabled]="submitted()" [attr.aria-pressed]="isSelected(option) ? 'true' : 'false'" data-mol-id="quiz-card-option" [attr.data-correct]="isCorrect(option) ? 'true' : null" [attr.data-wrong]="isWrong(option) ? 'true' : null" [class]="optionClasses(option)" [style]="optionStyle(option)"><span>@if (isText(option.label)) {<ng-container>{{ option.label }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(option.label)"></ng-container>}</span>@if (isCorrect(option)) {<span aria-hidden="true">✓</span>}@if (isWrong(option)) {<span aria-hidden="true">×</span>}</button>}</div>@if (!submitted()) {<button mol-button [variant]="'solid'" [color]="'primary'" (click)="submit()" [disabled]="!selected()">{{ submitLabel() }}</button>}<p #explanationEl [class]="explanationClasses()">@if (isText(explanation)) {<ng-container>{{ explanation }}</ng-container>}<ng-container [ngTemplateOutlet]="templateOf(explanation)"></ng-container><ng-content select="[slot=explanation]"></ng-content></p></div>`,
})
export class QuizCard {
  /** The question text — a string input, or `[slot=question]` projected content. */
  question?: unknown
  /** The answer options, rendered in order and keyed by `id`. */
  options: QuizOption[] = []
  /** Id of the correct option — when provided, submit reveals correct/incorrect. */
  correctId?: string
  /** Called when the user submits an answer. */
  onAnswer?: (optionId: string, correct?: boolean) => void
  /** Progress display — a string input, a template, or `[slot=progress]` content. */
  progress?: unknown
  /** Optional countdown / timer — a string input, a template, or `[slot=timer]` content. */
  timer?: unknown
  /** Explanation shown after submit — a string input, a template, or `[slot=explanation]` content. */
  explanation?: unknown
  /** Extra classes on the card. */
  className?: string

  /** The progress span (always in the template; detached when empty). */
  @ViewChild('progressEl') private progressEl?: ElementRef<HTMLSpanElement>
  /** The explanation paragraph (always in the template; detached when React renders none). */
  @ViewChild('explanationEl') private explanationEl?: ElementRef<HTMLParagraphElement>

  /** The i18n provider above the card (the submit label). */
  private readonly i18n = useTranslation()

  /** The selected option id. */
  private readonly selectedState = signal<string | null>(null)

  /** Whether the answer was submitted (the card is single-shot). */
  private readonly submittedState = signal(false)

  /**
   * Renders the progress span and the explanation paragraph only while React
   * would (see {@link QuizCard.syncWrappers}).
   */
  constructor() {
    usePlacement((hasContent) => this.syncWrappers(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the card class list — React's `Card` with the default `elevated`
   * variant and `md` padding, plus `className`.
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
   * The header class list.
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().flex({ justify: 'between', align: 'center', gap: 'sm' })
  }

  /**
   * The progress row class list.
   * @returns The class string.
   */
  progressClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))
  }

  /**
   * The question class list.
   * @returns The class string.
   */
  questionClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))
  }

  /**
   * The options container class list.
   * @returns The class string.
   */
  optionsClasses(): string {
    return this.cm().stack(2)
  }

  /**
   * The explanation class list.
   * @returns The class string.
   */
  explanationClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * One answer button's class list (React's weight switch on selection).
   * @param option - The option rendered.
   * @returns The class string.
   */
  optionClasses(option: QuizOption): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.cursorPointer,
      cm.touchTargetCompact,
      this.isSelected(option) ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
    )
  }

  /**
   * One answer button's inline style — React's verdict colours and touch
   * radius, exactly (no background declared unless a verdict shows).
   * @param option - The option rendered.
   * @returns The CSS text.
   */
  optionStyle(option: QuizOption): string {
    const success = 'var(--mol-color-success, #22c55e)'
    const error = 'var(--mol-color-error, #ef4444)'
    const correct = this.isCorrect(option)
    const wrong = this.isWrong(option)
    const border = correct
      ? success
      : wrong
        ? error
        : this.isSelected(option)
          ? 'currentColor'
          : 'var(--mol-color-border, rgba(128,128,128,0.35))'
    const background = correct
      ? `; background: color-mix(in srgb, ${success} 12%, transparent)`
      : wrong
        ? `; background: color-mix(in srgb, ${error} 12%, transparent)`
        : ''
    return `border-radius: 8px; border: 1px solid ${border}${background}`
  }

  /**
   * Whether an option is the current selection.
   * @param option - The option rendered.
   * @returns True when selected.
   */
  isSelected(option: QuizOption): boolean {
    return option.id === this.selectedState()
  }

  /**
   * React's `isCorrect`: the verdict shows only after submit, when a correct
   * id is set and this option is it.
   * @param option - The option rendered.
   * @returns True when the option is the revealed correct answer.
   */
  isCorrect(option: QuizOption): boolean {
    return this.submittedState() && !!this.correctId && option.id === this.correctId
  }

  /**
   * React's `isWrong`: the selected option after submit is not the correct one.
   * @param option - The option rendered.
   * @returns True when the option is the revealed wrong answer.
   */
  isWrong(option: QuizOption): boolean {
    return (
      this.submittedState() &&
      !!this.correctId &&
      this.isSelected(option) &&
      option.id !== this.correctId
    )
  }

  /**
   * Whether the answer was submitted.
   * @returns True after submit.
   */
  submitted(): boolean {
    return this.submittedState()
  }

  /**
   * The selected option id, if any.
   * @returns The id, or null.
   */
  selected(): string | null {
    return this.selectedState()
  }

  /**
   * Whether a value is plain text (React renders it as text, not as nodes).
   * @param value - A label, question or slot value.
   * @returns True when the value is a string.
   */
  isText(value: unknown): value is string {
    return typeof value === 'string'
  }

  /**
   * Narrows a value to an embedded template.
   * @param value - A label, question or slot value.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * Whether the progress row renders at all — React's `{progress && …}`.
   * @param projected - Whether `[slot=progress]` content is projected.
   * @returns True when a text, template or projected progress row exists.
   */
  hasProgress(projected: boolean): boolean {
    return (
      (typeof this.progress === 'string' && this.progress.length > 0) ||
      this.templateOf(this.progress) !== null ||
      projected
    )
  }

  /**
   * Whether the explanation renders — React's `explanation && <p>`.
   * @param projected - Whether `[slot=explanation]` content is projected.
   * @returns True when a text, template or projected explanation exists.
   */
  hasExplanation(projected: boolean): boolean {
    return (
      (typeof this.explanation === 'string' && this.explanation.length > 0) ||
      this.templateOf(this.explanation) !== null ||
      projected
    )
  }

  /**
   * The submit button's label.
   * @returns The translated text.
   */
  submitLabel(): string {
    return this.i18n.t('quizCard.submit', {}, { defaultValue: 'Submit answer' })
  }

  /**
   * Selects an option (React ignores the click after submit).
   * @param option - The clicked option.
   */
  select(option: QuizOption): void {
    if (!this.submittedState()) this.selectedState.set(option.id)
  }

  /** Validates the selection and fires onAnswer with the correctness flag. */
  submit(): void {
    const optionId = this.selectedState()
    if (!optionId || this.submittedState()) return
    this.submittedState.set(true)
    this.onAnswer?.(optionId, this.correctId ? optionId === this.correctId : undefined)
  }

  /**
   * Applies React's conditions: the progress span renders only while progress
   * is truthy, the explanation paragraph only after submit with one present.
   * The reader also sees the port's own text or template in a row, which
   * changes nothing: either one already shows the row.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private syncWrappers(hasContent: SlotReader): void {
    const progress = this.progressEl?.nativeElement
    setElementPresent(progress, this.hasProgress(!!progress && hasContent(progress)))
    const explanation = this.explanationEl?.nativeElement
    setElementPresent(
      explanation,
      this.submittedState() && this.hasExplanation(!!explanation && hasContent(explanation)),
    )
  }
}
