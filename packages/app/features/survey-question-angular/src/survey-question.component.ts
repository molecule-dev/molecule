/**
 * SurveyQuestion component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, signal } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { FileDropzone } from '@molecule/app-file-dropzone-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, styleText } from '@molecule/app-ui-angular'

import { MolChecked } from './controlled-checked.directive.js'
import type {
  DateQuestion,
  FileUploadQuestion,
  LongTextQuestion,
  MatrixQuestion,
  MultiChoiceMultiQuestion,
  MultiChoiceSingleQuestion,
  NPSQuestion,
  NumericQuestion,
  RatingScaleQuestion,
  ShortTextQuestion,
  SurveyAnswerMap,
  SurveyAnswerValue,
  SurveyQuestionDef,
  SurveyQuestionProps,
  TrueFalseQuestion,
} from './types.js'

/** The theme-token border both option rows share. */
const BORDER = 'var(--mol-color-border, rgba(128,128,128,0.35))'

/** Narrows the two ordered answer types, including the readonly file batch. */
function isAnswerList(
  value: SurveyAnswerValue | undefined,
): value is string[] | SurveyAnswerMap['file-upload'] {
  return Array.isArray(value)
}

/**
 * Returns true when `value` is a non-empty answer for the given kind.
 *
 * @param kind - Question kind discriminator.
 * @param value - Candidate answer value.
 * @returns Whether the value qualifies as answered.
 */
function hasAnswer(kind: SurveyQuestionDef['kind'], value: unknown): boolean {
  if (value === undefined || value === null) return false
  switch (kind) {
    case 'multi-choice-multi':
      return Array.isArray(value) && value.length > 0
    case 'file-upload':
      return Array.isArray(value) && value.length > 0
    case 'matrix':
      return (
        typeof value === 'object' &&
        value !== null &&
        Object.keys(value as Record<string, string>).length > 0
      )
    case 'short-text':
    case 'long-text':
    case 'date':
    case 'multi-choice-single':
      return typeof value === 'string' && value.trim().length > 0
    case 'numeric':
      return typeof value === 'number' && Number.isFinite(value)
    case 'rating-scale':
    case 'nps':
      return typeof value === 'number' && Number.isFinite(value)
    case 'true-false':
      return typeof value === 'boolean'
    default:
      return false
  }
}

/**
 * SurveyQuestion component.
 *
 * Multi-type survey question renderer. Discriminates on `question.kind` and
 * renders the matching control for one of 11 supported kinds.
 *
 * The host IS the outer `<div>` (`div[mol-survey-question]`), matching React's
 * root exactly — same classes, `data-mol-id` and `data-kind`. This is the
 * Angular counterpart of `@molecule/app-survey-question-react`: the same props
 * (React names), the same ClassMap tokens, and the same DOM for the same
 * input.
 *
 * @remarks
 * - Required-field validation runs only on submit; `onChange` always fires.
 * - File uploads delegate to the `div[mol-file-dropzone]` counterpart of the
 *   React package's `<FileDropzone>`.
 */
@Component({
  selector: 'div[mol-survey-question]',
  standalone: true,
  imports: [Button, FileDropzone, MolChecked],
  inputs: ['question', 'value', 'onChange', 'onSubmit', 'readOnly', 'className'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'rootId()',
    '[attr.data-kind]': 'question?.kind ?? null',
  },
  // prettier-ignore
  template: `<header [class]="cm().stack(1)"><h3 [class]="titleClasses()">{{ question?.prompt }}@if (question?.required) {<span [attr.aria-label]="requiredLabel()" style="color: rgb(239, 68, 68); margin-left: 4px" [attr.data-mol-id]="requiredId()">*</span>}</h3>@if (question?.description) {<p [class]="cm().textSize('sm')">{{ question.description }}</p>}</header><div [attr.data-mol-id]="inputId()">@switch (question?.kind) {@case ('multi-choice-single') {<div [class]="cm().stack(2)" role="radiogroup">@for (option of single()?.options ?? []; track option.value) {<button type="button" role="radio" [attr.aria-checked]="isSingle(option.value)" [disabled]="readOnly ?? false" (click)="setValue(option.value)" [class]="optionClasses(isSingle(option.value))" [style]="optionStyle(isSingle(option.value))" [attr.data-mol-id]="optionId(option.value)">{{ option.label }}</button>}</div>}@case ('multi-choice-multi') {<div [class]="cm().stack(2)" role="group">@for (option of multi()?.options ?? []; track option.value) {<button type="button" role="checkbox" [attr.aria-checked]="isMulti(option.value)" [disabled]="readOnly ?? false" (click)="toggleMulti(option.value)" [class]="optionClasses(isMulti(option.value))" [style]="optionStyle(isMulti(option.value))" [attr.data-mol-id]="optionId(option.value)"><span aria-hidden="true" style="display: inline-block; width: 16px">{{ isMulti(option.value) ? '☑' : '☐' }}</span><span>{{ option.label }}</span></button>}</div>}@case ('true-false') {<div [class]="cm().flex({ gap: 'sm', align: 'center' })" role="radiogroup"><button mol-button [type]="'button'" [variant]="value === true ? 'solid' : 'ghost'" [color]="'primary'" [size]="'sm'" [disabled]="readOnly ?? false" (click)="setValue(true)" [attr.data-mol-id]="trueOptionId()">{{ trueLabel() }}</button><button mol-button [type]="'button'" [variant]="value === false ? 'solid' : 'ghost'" [color]="'primary'" [size]="'sm'" [disabled]="readOnly ?? false" (click)="setValue(false)" [attr.data-mol-id]="falseOptionId()">{{ falseLabel() }}</button></div>}@case ('short-text') {<input type="text" [attr.value]="textValue()" [value]="textValue()" [attr.placeholder]="shortText()?.placeholder ?? null" [attr.maxlength]="shortText()?.maxLength ?? null" [disabled]="readOnly ?? false" (input)="onTextInput($event, false)" [attr.aria-label]="question.prompt" [class]="inputClasses()" style="border: 1px solid var(--mol-color-border, rgba(128,128,128,0.35)); border-radius: 8px; outline: none; width: 100%" [attr.data-mol-id]="inputId('survey-input')" />}@case ('long-text') {<textarea [value]="textValue()" [attr.placeholder]="longText()?.placeholder ?? null" [attr.maxlength]="longText()?.maxLength ?? null" [attr.rows]="longText()?.rows ?? 4" [disabled]="readOnly ?? false" (input)="onTextInput($event, true)" [attr.aria-label]="question.prompt" [class]="inputClasses()" style="border: 1px solid var(--mol-color-border, rgba(128,128,128,0.35)); border-radius: 8px; outline: none; resize: vertical; width: 100%" [attr.data-mol-id]="inputId('survey-input')"></textarea>}@case ('numeric') {<div [class]="cm().flex({ align: 'center', gap: 'xs' })"><input type="number" inputmode="decimal" [attr.value]="numericText()" [value]="numericText()" [attr.min]="numeric()?.min ?? null" [attr.max]="numeric()?.max ?? null" [attr.step]="numeric()?.step ?? null" [disabled]="readOnly ?? false" (input)="onNumericInput($event)" [attr.aria-label]="question.prompt" [class]="inputClasses()" [style]="numericStyle()" [attr.data-mol-id]="inputId('survey-input')" />@if (numeric()?.unit) {<span [class]="cm().cn(cm().textSize('sm'), cm().fontWeight('medium'))" [attr.data-mol-id]="inputId('survey-input') + '-unit'">{{ numeric()?.unit }}</span>}</div>}@case ('rating-scale') {<div [class]="cm().stack(1)"><div [class]="cm().flex({ gap: 'xs', align: 'center' })" role="radiogroup">@for (n of ratingButtons(); track n) {<button type="button" role="radio" [attr.aria-checked]="value === n" [disabled]="readOnly ?? false" (click)="setValue(n)" [class]="ratingClasses(n)" [style]="ratingStyle(n)" [attr.data-mol-id]="optionId(n)">{{ n }}</button>}</div>@if (ratingScale()?.lowLabel || ratingScale()?.highLabel) {<div [class]="cm().flex({ justify: 'between' })"><span [class]="cm().textSize('xs')">{{ ratingScale()?.lowLabel }}</span><span [class]="cm().textSize('xs')">{{ ratingScale()?.highLabel }}</span></div>}</div>}@case ('nps') {<div [class]="cm().stack(1)"><div [class]="cm().flex({ gap: 'xs', align: 'center' })" role="radiogroup">@for (n of npsButtons; track n) {<button type="button" role="radio" [attr.aria-checked]="value === n" [disabled]="readOnly ?? false" (click)="setValue(n)" [class]="npsClasses(n)" [style]="npsStyle(n)" [attr.data-mol-id]="optionId(n)">{{ n }}</button>}</div><div [class]="cm().flex({ justify: 'between' })"><span [class]="cm().textSize('xs')">{{ npsLow() }}</span><span [class]="cm().textSize('xs')">{{ npsHigh() }}</span></div></div>}@case ('date') {<input type="date" [attr.value]="textValue()" [value]="textValue()" [attr.min]="date()?.min ?? null" [attr.max]="date()?.max ?? null" [disabled]="readOnly ?? false" (input)="onTextInput($event, false)" [attr.aria-label]="question.prompt" [class]="inputClasses()" style="border: 1px solid var(--mol-color-border, rgba(128,128,128,0.35)); border-radius: 8px; outline: none" [attr.data-mol-id]="inputId('survey-input')" />}@case ('file-upload') {<div [class]="cm().stack(2)"><div mol-file-dropzone [accept]="fileUpload()?.accept" [multiple]="fileUpload()?.multiple" [maxSize]="fileUpload()?.maxSize" [disabled]="readOnly" [onFiles]="uploadFiles"></div>@if (fileValue().length > 0) {<ul [class]="cm().stack(1)" [attr.data-mol-id]="inputId('survey-input') + '-files'">@for (file of fileValue(); track $index) {<li [class]="cm().textSize('xs')">{{ file.name }}</li>}</ul>}@if (fileValue().length === 0) {<p [class]="cm().textSize('xs')">{{ noFilesText() }}</p>}</div>}@case ('matrix') {<table [class]="cm().cn(cm().textSize('sm'))" style="border-collapse: collapse; width: 100%" [attr.data-mol-id]="'survey-matrix-' + question.id"><thead><tr><th style="text-align: left; padding: 4px"></th>@for (column of matrix()?.columns ?? []; track column.value) {<th style="text-align: center; padding: 4px" scope="col">{{ column.label }}</th>}</tr></thead><tbody>@for (row of matrix()?.rows ?? []; track row.id) {<tr><th style="text-align: left; padding: 4px" scope="row" [attr.data-mol-id]="matrixRowId(row.id)">{{ row.label }}</th>@for (column of matrix()?.columns ?? []; track column.value) {<td style="text-align: center; padding: 4px"><input type="radio" [attr.name]="matrixName(row.id)" [molChecked]="isCellSelected(row.id, column.value)" [disabled]="readOnly ?? false" (change)="setRow(row.id, column.value)" [attr.aria-label]="row.label + ' - ' + column.label" [attr.data-mol-id]="matrixCellId(row.id, column.value)" /></td>}</tr>}</tbody></table>}}</div>@if (question?.helpText) {<p [class]="cm().textSize('xs')" [attr.data-mol-id]="helpId()">{{ question.helpText }}</p>}@if (error()) {<p [class]="cm().textSize('xs')" style="color: rgb(239, 68, 68)" role="alert" [attr.data-mol-id]="errorId()">{{ error() }}</p>}@if (onSubmit && !readOnly) {<div><button mol-button [type]="'button'" [variant]="'solid'" [color]="'primary'" (click)="handleSubmit()">{{ submitText() }}</button></div>}`,
})
export class SurveyQuestion {
  /** The question payload (discriminated union across 11 kinds). */
  question?: SurveyQuestionDef
  /** Current answer value. */
  value?: SurveyAnswerValue
  /** Called whenever the answer value changes. */
  onChange?: (value: SurveyAnswerValue) => void
  /** Called on submit, after required-field validation passes. */
  onSubmit?: SurveyQuestionProps['onSubmit']
  /** When true, every input is disabled and no controls fire change events. */
  readOnly?: boolean
  /** Extra classes on the root wrapper. */
  className?: string

  /** The required-field error, shown until the next change or submit. */
  readonly error = signal<string | null>(null)
  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()
  /** The host element (the root `<div>`). */
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef)

  /** The NPS scale's points (0–10). */
  readonly npsButtons: number[] = Array.from({ length: 11 }, (_unused, index) => index)

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The root wrapper's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(3), this.className)
  }

  /**
   * The question heading's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('lg'), this.cm().fontWeight('semibold'))
  }

  /**
   * The input controls' shared class list.
   * @returns The class string.
   */
  inputClasses(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().sp('px', 3), this.cm().sp('py', 2))
  }

  /**
   * The required marker's aria-label.
   * @returns The label text.
   */
  requiredLabel(): string {
    return this.i18n.t('surveyQuestion.requiredIndicator', {}, { defaultValue: 'required' })
  }

  /**
   * The submit button's text.
   * @returns The label text.
   */
  submitText(): string {
    return this.i18n.t('surveyQuestion.submit', {}, { defaultValue: 'Submit' })
  }

  /**
   * The "true" toggle's text.
   * @returns The label text.
   */
  trueLabel(): string {
    return (
      this.trueFalse()?.trueLabel ??
      this.i18n.t('surveyQuestion.trueFalse.true', {}, { defaultValue: 'True' })
    )
  }

  /**
   * The "false" toggle's text.
   * @returns The label text.
   */
  falseLabel(): string {
    return (
      this.trueFalse()?.falseLabel ??
      this.i18n.t('surveyQuestion.trueFalse.false', {}, { defaultValue: 'False' })
    )
  }

  /**
   * The NPS low-end label.
   * @returns The label text.
   */
  npsLow(): string {
    return (
      this.nps()?.lowLabel ??
      this.i18n.t('surveyQuestion.nps.low', {}, { defaultValue: 'Not at all likely' })
    )
  }

  /**
   * The NPS high-end label.
   * @returns The label text.
   */
  npsHigh(): string {
    return (
      this.nps()?.highLabel ??
      this.i18n.t('surveyQuestion.nps.high', {}, { defaultValue: 'Extremely likely' })
    )
  }

  /**
   * The empty file-list copy.
   * @returns The label text.
   */
  noFilesText(): string {
    return this.i18n.t(
      'surveyQuestion.file.noFiles',
      {},
      {
        defaultValue: 'No files selected.',
      },
    )
  }

  /**
   * The root `data-mol-id`.
   * @returns The id.
   */
  rootId(): string | null {
    return this.question ? `survey-question-${this.question.id}` : null
  }

  /**
   * A `data-mol-id` under the question.
   * @param prefix - The attribute prefix (`survey-input`).
   * @returns The id.
   */
  inputId(prefix = 'survey-question'): string {
    const id = this.question?.id ?? ''
    return prefix === 'survey-question' ? `survey-question-${id}-input` : `${prefix}-${id}`
  }

  /**
   * The required marker's id.
   * @returns The id.
   */
  requiredId(): string {
    return `survey-question-${this.question?.id ?? ''}-required`
  }

  /**
   * The help paragraph's id.
   * @returns The id.
   */
  helpId(): string {
    return `survey-question-${this.question?.id ?? ''}-help`
  }

  /**
   * The error paragraph's id.
   * @returns The id.
   */
  errorId(): string {
    return `survey-question-${this.question?.id ?? ''}-error`
  }

  /**
   * An option button's id.
   * @param option - The option value.
   * @returns The id.
   */
  optionId(option: string | number): string {
    return `survey-option-${this.question?.id ?? ''}-${option}`
  }

  /**
   * The "true" toggle's id.
   * @returns The id.
   */
  trueOptionId(): string {
    return `survey-option-${this.question?.id ?? ''}-true`
  }

  /**
   * The "false" toggle's id.
   * @returns The id.
   */
  falseOptionId(): string {
    return `survey-option-${this.question?.id ?? ''}-false`
  }

  /**
   * A matrix row header's id.
   * @param rowId - The row id.
   * @returns The id.
   */
  matrixRowId(rowId: string): string {
    return `survey-matrix-${this.question?.id ?? ''}-row-${rowId}`
  }

  /**
   * A matrix cell's id.
   * @param rowId - The row id.
   * @param column - The column value.
   * @returns The id.
   */
  matrixCellId(rowId: string, column: string): string {
    return `survey-matrix-${this.question?.id ?? ''}-${rowId}-${column}`
  }

  /**
   * A matrix row's radio group name.
   * @param rowId - The row id.
   * @returns The name.
   */
  matrixName(rowId: string): string {
    return `${this.question?.id ?? ''}-${rowId}`
  }

  /**
   * The question as a single-pick question, or null.
   * @returns The question.
   */
  single(): MultiChoiceSingleQuestion | null {
    return this.question?.kind === 'multi-choice-single' ? this.question : null
  }

  /**
   * The question as a multi-pick question, or null.
   * @returns The question.
   */
  multi(): MultiChoiceMultiQuestion | null {
    return this.question?.kind === 'multi-choice-multi' ? this.question : null
  }

  /**
   * The question as a true/false question, or null.
   * @returns The question.
   */
  trueFalse(): TrueFalseQuestion | null {
    return this.question?.kind === 'true-false' ? this.question : null
  }

  /**
   * The question as a short-text question, or null.
   * @returns The question.
   */
  shortText(): ShortTextQuestion | null {
    return this.question?.kind === 'short-text' ? this.question : null
  }

  /**
   * The question as a long-text question, or null.
   * @returns The question.
   */
  longText(): LongTextQuestion | null {
    return this.question?.kind === 'long-text' ? this.question : null
  }

  /**
   * The question as a numeric question, or null.
   * @returns The question.
   */
  numeric(): NumericQuestion | null {
    return this.question?.kind === 'numeric' ? this.question : null
  }

  /**
   * The question as a rating-scale question, or null.
   * @returns The question.
   */
  ratingScale(): RatingScaleQuestion | null {
    return this.question?.kind === 'rating-scale' ? this.question : null
  }

  /**
   * The question as an NPS question, or null.
   * @returns The question.
   */
  nps(): NPSQuestion | null {
    return this.question?.kind === 'nps' ? this.question : null
  }

  /**
   * The question as a date question, or null.
   * @returns The question.
   */
  date(): DateQuestion | null {
    return this.question?.kind === 'date' ? this.question : null
  }

  /**
   * The question as a file-upload question, or null.
   * @returns The question.
   */
  fileUpload(): FileUploadQuestion | null {
    return this.question?.kind === 'file-upload' ? this.question : null
  }

  /**
   * The question as a matrix question, or null.
   * @returns The question.
   */
  matrix(): MatrixQuestion | null {
    return this.question?.kind === 'matrix' ? this.question : null
  }

  /**
   * The current value as text (React's `(value as string) ?? ''`).
   * @returns The text.
   */
  textValue(): string {
    return typeof this.value === 'string' ? this.value : ''
  }

  /**
   * The current value as a list of option values.
   * @returns The values.
   */
  listValue(): string[] {
    return Array.isArray(this.value) ? (this.value as string[]) : []
  }

  /**
   * The current value as a list of files.
   * @returns The files.
   */
  fileValue(): SurveyAnswerMap['file-upload'] {
    return isAnswerList(this.value) ? this.value.filter((entry) => typeof entry !== 'string') : []
  }

  /**
   * The current value as a matrix row mapping.
   * @returns The mapping.
   */
  matrixValue(): Record<string, string> {
    return this.value !== null && typeof this.value === 'object' && !Array.isArray(this.value)
      ? (this.value as Record<string, string>)
      : {}
  }

  /**
   * The current numeric answer as field text.
   * @returns The text.
   */
  numericText(): string {
    return typeof this.value === 'number' ? String(this.value) : this.value === '' ? '' : ''
  }

  /**
   * Whether a single-pick option is selected.
   * @param option - The option value.
   * @returns Whether it is selected.
   */
  isSingle(option: string): boolean {
    return this.textValue() === option
  }

  /**
   * Whether a multi-pick option is selected.
   * @param option - The option value.
   * @returns Whether it is selected.
   */
  isMulti(option: string): boolean {
    return this.listValue().includes(option)
  }

  /**
   * Whether a matrix cell is selected.
   * @param rowId - The row id.
   * @param column - The column value.
   * @returns Whether it is selected.
   */
  isCellSelected(rowId: string, column: string): boolean {
    return this.matrixValue()[rowId] === column
  }

  /**
   * The rating-scale points, React's 1–5 defaults.
   * @returns The points.
   */
  ratingButtons(): number[] {
    const min = this.ratingScale()?.min ?? 1
    const max = this.ratingScale()?.max ?? 5
    const buttons: number[] = []
    for (let i = min; i <= max; i++) buttons.push(i)
    return buttons
  }

  /**
   * One option row's class list.
   * @param selected - Whether the option is selected.
   * @returns The class string.
   */
  optionClasses(selected: boolean): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      this.readOnly ? undefined : cm.cursorPointer,
      cm.touchTargetCompact,
      selected ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
    )
  }

  /**
   * One rating-scale point's class list.
   * @param n - The point.
   * @returns The class string.
   */
  ratingClasses(n: number): string {
    const cm = this.cm()
    return cm.cn(
      cm.textSize('sm'),
      cm.roundedFull,
      this.readOnly ? undefined : cm.cursorPointer,
      cm.fontWeight(this.value === n ? 'bold' : 'medium'),
    )
  }

  /**
   * One NPS point's class list.
   * @param n - The point.
   * @returns The class string.
   */
  npsClasses(n: number): string {
    const cm = this.cm()
    return cm.cn(
      cm.textSize('sm'),
      this.readOnly ? undefined : cm.cursorPointer,
      cm.fontWeight(this.value === n ? 'bold' : 'medium'),
    )
  }

  /**
   * One option row's inline style.
   * @param selected - Whether the option is selected.
   * @returns The style attribute text.
   */
  optionStyle(selected: boolean): string | null {
    return styleText({
      'border-radius': '8px',
      border: `1px solid ${selected ? 'currentColor' : BORDER}`,
      opacity: this.readOnly ? 0.6 : 1,
      'text-align': 'left',
    })
  }

  /**
   * One rating-scale point's inline style.
   * @param n - The point.
   * @returns The style attribute text.
   */
  ratingStyle(n: number): string | null {
    const selected = this.value === n
    return styleText({
      border: `1px solid ${selected ? 'currentColor' : BORDER}`,
      width: 36,
      height: 36,
      opacity: this.readOnly ? 0.6 : 1,
      background: selected ? 'color-mix(in srgb, currentColor 8%, transparent)' : undefined,
    })
  }

  /**
   * One NPS point's inline style.
   * @param n - The point.
   * @returns The style attribute text.
   */
  npsStyle(n: number): string | null {
    const selected = this.value === n
    return styleText({
      border: `1px solid ${selected ? 'currentColor' : BORDER}`,
      'border-radius': '6px',
      width: 32,
      height: 32,
      opacity: this.readOnly ? 0.6 : 1,
      background: selected ? 'color-mix(in srgb, currentColor 8%, transparent)' : undefined,
    })
  }

  /**
   * The numeric input's inline style.
   * @returns The style attribute text.
   */
  numericStyle(): string | null {
    return styleText({
      border: '1px solid var(--mol-color-border, rgba(128,128,128,0.35))',
      'border-radius': '8px',
      outline: 'none',
      width: this.numeric()?.unit ? '12rem' : '100%',
    })
  }

  /** The dropzone's `onFiles` handler. */
  readonly uploadFiles = (files: SurveyAnswerMap['file-upload']): void => {
    this.setValue(files)
  }

  /**
   * Reports a new answer value: clears the error and calls `onChange`.
   * @param next - The new value.
   */
  setValue(next: SurveyAnswerValue): void {
    if (this.readOnly) return
    this.error.set(null)
    this.onChange?.(next)
  }

  /**
   * Toggles a multi-pick option in or out of the selected values.
   * @param option - The option value.
   */
  toggleMulti(option: string): void {
    if (this.readOnly) return
    const value = this.listValue()
    if (value.includes(option)) this.setValue(value.filter((x) => x !== option))
    else this.setValue([...value, option])
  }

  /**
   * Handles a text, textarea or date input event, then restores the controlled
   * value exactly as react-dom does after an input event.
   * @param event - The native input event.
   * @param textarea - Whether the field is a textarea (React writes its value
   *   through the property only).
   */
  onTextInput(event: Event, textarea: boolean): void {
    const element = event.target as HTMLInputElement | HTMLTextAreaElement
    this.setValue(element.value)
    const text = this.textValue()
    if (element.value !== text) element.value = text
    if (!textarea && element.getAttribute('value') !== text) element.setAttribute('value', text)
  }

  /**
   * Parses the numeric field and reports it, then restores the controlled
   * value exactly as react-dom does after an input event.
   * @param event - The native input event.
   */
  onNumericInput(event: Event): void {
    const input = event.target as HTMLInputElement
    const raw = input.value
    if (raw === '') this.setValue('')
    else {
      const parsed = Number(raw)
      if (Number.isFinite(parsed)) this.setValue(parsed)
    }
    const text = this.numericText()
    if (input.value !== text) input.value = text
    if (input.getAttribute('value') !== text) input.setAttribute('value', text)
  }

  /**
   * Updates a single matrix row's selected column value.
   * @param rowId - The row the change came from.
   * @param column - The selected column value.
   */
  setRow(rowId: string, column: string): void {
    if (this.readOnly) return
    this.setValue({ ...this.matrixValue(), [rowId]: column })
    // React restores every radio of the changed name group to the controlled
    // value after the change event, so a click on another cell of the row
    // leaves the previously selected cell checked.
    const element = this.el.nativeElement
    const name = this.matrixName(rowId)
    const columns = this.matrix()?.columns ?? []
    let index = 0
    for (const radio of Array.from(element.querySelectorAll('input[type="radio"]'))) {
      const input = radio as HTMLInputElement
      if (input.name !== name) continue
      input.checked = this.matrixValue()[rowId] === columns[index]?.value
      index++
    }
  }

  /** Validates the required field and calls `onSubmit`. */
  handleSubmit(): void {
    if (this.readOnly) return
    const question = this.question
    if (!question) return
    if (question.required && !hasAnswer(question.kind, this.value)) {
      this.error.set(
        this.i18n.t(
          'surveyQuestion.required',
          {},
          {
            defaultValue: 'This question requires an answer.',
          },
        ),
      )
      return
    }
    this.error.set(null)
    this.onSubmit?.(this.value)
  }
}
