import type { ChangeEvent } from 'react'
import { useCallback, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { FileDropzone } from '@molecule/app-file-dropzone-react'

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
  SurveyAnswerValue,
  SurveyQuestionDef,
  TrueFalseQuestion,
} from './types.js'

/** Props for the `<SurveyQuestion>` renderer. */
export interface SurveyQuestionProps {
  /** Discriminated-union question payload — drives which sub-component is rendered. */
  question: SurveyQuestionDef
  /** Current answer value (kind-dependent shape). */
  value?: SurveyAnswerValue
  /** Called whenever the answer value changes. */
  onChange?: (value: SurveyAnswerValue) => void
  /** Called when the user clicks "Submit" — only fires when the answer passes required-field validation. */
  onSubmit?: (value: SurveyAnswerValue) => void
  /** When true, every input is disabled and no controls fire change events. */
  readOnly?: boolean
  /** Optional extra classes on the root wrapper. */
  className?: string
}

/**
 * Multi-type survey question renderer. Discriminates on `question.kind` and
 * renders the matching sub-component for one of 11 supported kinds:
 *
 * - `multi-choice-single`, `multi-choice-multi`
 * - `true-false`
 * - `short-text`, `long-text`
 * - `numeric` (with optional unit)
 * - `rating-scale` (configurable min/max, defaults to 1–5)
 * - `nps` (0–10)
 * - `date`
 * - `file-upload` (delegates to `<FileDropzone>`)
 * - `matrix` (sub-questions × shared options)
 *
 * Required-field validation runs only on submit; `onChange` always fires.
 * All styling goes through `getClassMap()`. All UI text goes through `t()`
 * with English fallbacks; translations live in `@molecule/app-locales-survey-question`.
 *
 * @param props - Component props.
 * @returns The question element.
 */
export function SurveyQuestion(props: SurveyQuestionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { question, value, onChange, onSubmit, readOnly, className } = props
  const [error, setError] = useState<string | null>(null)

  const setValue = useCallback(
    (next: SurveyAnswerValue) => {
      if (readOnly) return
      setError(null)
      onChange?.(next)
    },
    [onChange, readOnly],
  )

  const handleSubmit = useCallback(() => {
    if (readOnly) return
    if (question.required && !hasAnswer(question.kind, value)) {
      setError(
        t('surveyQuestion.required', {}, { defaultValue: 'This question requires an answer.' }),
      )
      return
    }
    setError(null)
    onSubmit?.(value as SurveyAnswerValue)
  }, [question, readOnly, t, value, onSubmit])

  return (
    <div
      className={cm.cn(cm.stack(3), className)}
      data-mol-id={`survey-question-${question.id}`}
      data-kind={question.kind}
    >
      <header className={cm.stack(1)}>
        <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {question.prompt}
          {question.required && (
            <span
              aria-label={t('surveyQuestion.requiredIndicator', {}, { defaultValue: 'required' })}
              style={{ color: '#ef4444', marginLeft: 4 }}
              data-mol-id={`survey-question-${question.id}-required`}
            >
              *
            </span>
          )}
        </h3>
        {question.description && <p className={cm.textSize('sm')}>{question.description}</p>}
      </header>
      <div data-mol-id={`survey-question-${question.id}-input`}>
        {renderControl(question, value, setValue, readOnly)}
      </div>
      {question.helpText && (
        <p className={cm.textSize('xs')} data-mol-id={`survey-question-${question.id}-help`}>
          {question.helpText}
        </p>
      )}
      {error && (
        <p
          className={cm.textSize('xs')}
          style={{ color: '#ef4444' }}
          role="alert"
          data-mol-id={`survey-question-${question.id}-error`}
        >
          {error}
        </p>
      )}
      {onSubmit && !readOnly && (
        <div>
          <Button type="button" variant="solid" color="primary" onClick={handleSubmit}>
            {t('surveyQuestion.submit', {}, { defaultValue: 'Submit' })}
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Returns true when `value` is a non-empty answer for the given kind.
 *
 * @param kind - Question kind discriminator.
 * @param value - Candidate answer value.
 * @returns Whether the value qualifies as "answered".
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
 * Dispatch the right per-kind sub-component.
 *
 * @param q - The question.
 * @param value - Current answer value.
 * @param setValue - Update callback.
 * @param readOnly - Disabled state.
 * @returns The control element.
 */
function renderControl(
  q: SurveyQuestionDef,
  value: SurveyAnswerValue | undefined,
  setValue: (v: SurveyAnswerValue) => void,
  readOnly?: boolean,
) {
  switch (q.kind) {
    case 'multi-choice-single':
      return (
        <MultiChoiceSingleControl
          question={q}
          value={(value as string) ?? ''}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'multi-choice-multi':
      return (
        <MultiChoiceMultiControl
          question={q}
          value={(value as string[]) ?? []}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'true-false':
      return (
        <TrueFalseControl
          question={q}
          value={value as boolean | undefined}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'short-text':
      return (
        <ShortTextControl
          question={q}
          value={(value as string) ?? ''}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'long-text':
      return (
        <LongTextControl
          question={q}
          value={(value as string) ?? ''}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'numeric':
      return (
        <NumericControl
          question={q}
          value={(value as number | '') ?? ''}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'rating-scale':
      return (
        <RatingScaleControl
          question={q}
          value={value as number | undefined}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'nps':
      return (
        <NPSControl
          question={q}
          value={value as number | undefined}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'date':
      return (
        <DateControl
          question={q}
          value={(value as string) ?? ''}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'file-upload':
      return (
        <FileUploadControl
          question={q}
          value={(value as File[]) ?? []}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'matrix':
      return (
        <MatrixControl
          question={q}
          value={(value as Record<string, string>) ?? {}}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    default: {
      // Exhaustiveness check.
      const _exhaustive: never = q
      void _exhaustive
      return null
    }
  }
}

/* ---------------- per-kind sub-components ---------------- */

interface ControlProps<Q, V> {
  question: Q
  value: V
  onChange: (value: SurveyAnswerValue) => void
  readOnly?: boolean
}

/**
 * Multi-choice single-pick (radio-button group rendered as buttons).
 *
 * @param props - Control props.
 * @returns The radio-button group.
 */
function MultiChoiceSingleControl({
  question,
  value,
  onChange,
  readOnly,
}: ControlProps<MultiChoiceSingleQuestion, string>) {
  const cm = getClassMap()
  return (
    <div className={cm.stack(2)} role="radiogroup">
      {question.options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={readOnly}
            onClick={() => onChange(opt.value)}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              selected ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
            )}
            style={{
              borderRadius: 8,
              border: `1px solid ${selected ? 'currentColor' : 'rgba(0,0,0,0.15)'}`,
              cursor: readOnly ? 'not-allowed' : 'pointer',
              opacity: readOnly ? 0.6 : 1,
              textAlign: 'left',
            }}
            data-mol-id={`survey-option-${question.id}-${opt.value}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Multi-choice multi-pick (checkbox group rendered as buttons).
 *
 * @param props - Control props.
 * @returns The checkbox group.
 */
function MultiChoiceMultiControl({
  question,
  value,
  onChange,
  readOnly,
}: ControlProps<MultiChoiceMultiQuestion, string[]>) {
  const cm = getClassMap()
  function toggle(v: string) {
    if (readOnly) return
    if (value.includes(v)) onChange(value.filter((x) => x !== v))
    else onChange([...value, v])
  }
  return (
    <div className={cm.stack(2)} role="group">
      {question.options.map((opt) => {
        const selected = value.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            role="checkbox"
            aria-checked={selected}
            disabled={readOnly}
            onClick={() => toggle(opt.value)}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              selected ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
            )}
            style={{
              borderRadius: 8,
              border: `1px solid ${selected ? 'currentColor' : 'rgba(0,0,0,0.15)'}`,
              cursor: readOnly ? 'not-allowed' : 'pointer',
              opacity: readOnly ? 0.6 : 1,
              textAlign: 'left',
            }}
            data-mol-id={`survey-option-${question.id}-${opt.value}`}
          >
            <span aria-hidden style={{ display: 'inline-block', width: 16 }}>
              {selected ? '☑' : '☐'}
            </span>
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * True/false toggle.
 *
 * @param props - Control props.
 * @returns The toggle control.
 */
function TrueFalseControl({
  question,
  value,
  onChange,
  readOnly,
}: ControlProps<TrueFalseQuestion, boolean | undefined>) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const trueLabel =
    question.trueLabel ?? t('surveyQuestion.trueFalse.true', {}, { defaultValue: 'True' })
  const falseLabel =
    question.falseLabel ?? t('surveyQuestion.trueFalse.false', {}, { defaultValue: 'False' })
  return (
    <div className={cm.flex({ gap: 'sm', align: 'center' })} role="radiogroup">
      <Button
        type="button"
        variant={value === true ? 'solid' : 'ghost'}
        color={value === true ? 'primary' : undefined}
        size="sm"
        disabled={readOnly}
        onClick={() => onChange(true)}
        data-mol-id={`survey-option-${question.id}-true`}
      >
        {trueLabel}
      </Button>
      <Button
        type="button"
        variant={value === false ? 'solid' : 'ghost'}
        color={value === false ? 'primary' : undefined}
        size="sm"
        disabled={readOnly}
        onClick={() => onChange(false)}
        data-mol-id={`survey-option-${question.id}-false`}
      >
        {falseLabel}
      </Button>
    </div>
  )
}

/**
 * Short single-line text input.
 *
 * @param props - Control props.
 * @returns The input element.
 */
function ShortTextControl({
  question,
  value,
  onChange,
  readOnly,
}: ControlProps<ShortTextQuestion, string>) {
  const cm = getClassMap()
  return (
    <input
      type="text"
      value={value}
      placeholder={question.placeholder}
      maxLength={question.maxLength}
      disabled={readOnly}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      aria-label={question.prompt}
      className={cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2))}
      style={{
        border: '1px solid rgba(0,0,0,0.15)',
        borderRadius: 8,
        outline: 'none',
        width: '100%',
      }}
      data-mol-id={`survey-input-${question.id}`}
    />
  )
}

/**
 * Long multi-line textarea.
 *
 * @param props - Control props.
 * @returns The textarea element.
 */
function LongTextControl({
  question,
  value,
  onChange,
  readOnly,
}: ControlProps<LongTextQuestion, string>) {
  const cm = getClassMap()
  return (
    <textarea
      value={value}
      placeholder={question.placeholder}
      maxLength={question.maxLength}
      rows={question.rows ?? 4}
      disabled={readOnly}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      aria-label={question.prompt}
      className={cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2))}
      style={{
        border: '1px solid rgba(0,0,0,0.15)',
        borderRadius: 8,
        outline: 'none',
        width: '100%',
        resize: 'vertical',
      }}
      data-mol-id={`survey-input-${question.id}`}
    />
  )
}

/**
 * Numeric input with optional unit suffix.
 *
 * @param props - Control props.
 * @returns The numeric input row.
 */
function NumericControl({
  question,
  value,
  onChange,
  readOnly,
}: ControlProps<NumericQuestion, number | ''>) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ align: 'center', gap: 'xs' })}>
      <input
        type="number"
        inputMode="decimal"
        value={value === '' ? '' : String(value)}
        min={question.min}
        max={question.max}
        step={question.step}
        disabled={readOnly}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const raw = e.target.value
          if (raw === '') {
            onChange('')
            return
          }
          const n = Number(raw)
          if (Number.isFinite(n)) onChange(n)
        }}
        aria-label={question.prompt}
        className={cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2))}
        style={{
          border: '1px solid rgba(0,0,0,0.15)',
          borderRadius: 8,
          outline: 'none',
          width: question.unit ? '12rem' : '100%',
        }}
        data-mol-id={`survey-input-${question.id}`}
      />
      {question.unit && (
        <span
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
          data-mol-id={`survey-input-${question.id}-unit`}
        >
          {question.unit}
        </span>
      )}
    </div>
  )
}

/**
 * Rating scale (e.g. 1-5 or 1-10) rendered as a row of buttons.
 *
 * @param props - Control props.
 * @returns The rating-scale row.
 */
function RatingScaleControl({
  question,
  value,
  onChange,
  readOnly,
}: ControlProps<RatingScaleQuestion, number | undefined>) {
  const cm = getClassMap()
  const min = question.min ?? 1
  const max = question.max ?? 5
  const buttons: number[] = []
  for (let i = min; i <= max; i++) buttons.push(i)
  return (
    <div className={cm.stack(1)}>
      <div className={cm.flex({ gap: 'xs', align: 'center' })} role="radiogroup">
        {buttons.map((n) => {
          const selected = value === n
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={readOnly}
              onClick={() => onChange(n)}
              className={cm.cn(cm.textSize('sm'), cm.fontWeight(selected ? 'bold' : 'medium'))}
              style={{
                border: `1px solid ${selected ? 'currentColor' : 'rgba(0,0,0,0.15)'}`,
                borderRadius: 999,
                width: 36,
                height: 36,
                cursor: readOnly ? 'not-allowed' : 'pointer',
                opacity: readOnly ? 0.6 : 1,
                background: selected ? 'rgba(0,0,0,0.05)' : undefined,
              }}
              data-mol-id={`survey-option-${question.id}-${n}`}
            >
              {n}
            </button>
          )
        })}
      </div>
      {(question.lowLabel || question.highLabel) && (
        <div className={cm.flex({ justify: 'between' })}>
          <span className={cm.textSize('xs')}>{question.lowLabel}</span>
          <span className={cm.textSize('xs')}>{question.highLabel}</span>
        </div>
      )}
    </div>
  )
}

/**
 * NPS 0–10 scale.
 *
 * @param props - Control props.
 * @returns The NPS row.
 */
function NPSControl({
  question,
  value,
  onChange,
  readOnly,
}: ControlProps<NPSQuestion, number | undefined>) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const lowLabel =
    question.lowLabel ?? t('surveyQuestion.nps.low', {}, { defaultValue: 'Not at all likely' })
  const highLabel =
    question.highLabel ?? t('surveyQuestion.nps.high', {}, { defaultValue: 'Extremely likely' })
  const buttons: number[] = []
  for (let i = 0; i <= 10; i++) buttons.push(i)
  return (
    <div className={cm.stack(1)}>
      <div className={cm.flex({ gap: 'xs', align: 'center' })} role="radiogroup">
        {buttons.map((n) => {
          const selected = value === n
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={readOnly}
              onClick={() => onChange(n)}
              className={cm.cn(cm.textSize('sm'), cm.fontWeight(selected ? 'bold' : 'medium'))}
              style={{
                border: `1px solid ${selected ? 'currentColor' : 'rgba(0,0,0,0.15)'}`,
                borderRadius: 6,
                width: 32,
                height: 32,
                cursor: readOnly ? 'not-allowed' : 'pointer',
                opacity: readOnly ? 0.6 : 1,
                background: selected ? 'rgba(0,0,0,0.05)' : undefined,
              }}
              data-mol-id={`survey-option-${question.id}-${n}`}
            >
              {n}
            </button>
          )
        })}
      </div>
      <div className={cm.flex({ justify: 'between' })}>
        <span className={cm.textSize('xs')}>{lowLabel}</span>
        <span className={cm.textSize('xs')}>{highLabel}</span>
      </div>
    </div>
  )
}

/**
 * Native date input.
 *
 * @param props - Control props.
 * @returns The date input.
 */
function DateControl({ question, value, onChange, readOnly }: ControlProps<DateQuestion, string>) {
  const cm = getClassMap()
  return (
    <input
      type="date"
      value={value}
      min={question.min}
      max={question.max}
      disabled={readOnly}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      aria-label={question.prompt}
      className={cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2))}
      style={{
        border: '1px solid rgba(0,0,0,0.15)',
        borderRadius: 8,
        outline: 'none',
      }}
      data-mol-id={`survey-input-${question.id}`}
    />
  )
}

/**
 * File-upload control — delegates to `<FileDropzone>`.
 *
 * @param props - Control props.
 * @returns The file dropzone wrapper.
 */
function FileUploadControl({
  question,
  value,
  onChange,
  readOnly,
}: ControlProps<FileUploadQuestion, File[]>) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div className={cm.stack(2)}>
      <FileDropzone
        accept={question.accept}
        multiple={question.multiple}
        maxSize={question.maxSize}
        disabled={readOnly}
        onFiles={(files) => onChange(files)}
      />
      {value.length > 0 && (
        <ul className={cm.stack(1)} data-mol-id={`survey-input-${question.id}-files`}>
          {value.map((f, i) => (
            <li key={`${f.name}-${i}`} className={cm.textSize('xs')}>
              {f.name}
            </li>
          ))}
        </ul>
      )}
      {value.length === 0 && (
        <p className={cm.textSize('xs')}>
          {t('surveyQuestion.file.noFiles', {}, { defaultValue: 'No files selected.' })}
        </p>
      )}
    </div>
  )
}

/**
 * Matrix question — rows × columns. Each row is an independent radio-group.
 *
 * @param props - Control props.
 * @returns The matrix table.
 */
function MatrixControl({
  question,
  value,
  onChange,
  readOnly,
}: ControlProps<MatrixQuestion, Record<string, string>>) {
  const cm = getClassMap()
  function setRow(rowId: string, colValue: string) {
    if (readOnly) return
    onChange({ ...value, [rowId]: colValue })
  }
  return (
    <table
      className={cm.cn(cm.textSize('sm'))}
      style={{ borderCollapse: 'collapse', width: '100%' }}
      data-mol-id={`survey-matrix-${question.id}`}
    >
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 4 }} />
          {question.columns.map((col) => (
            <th key={col.value} style={{ textAlign: 'center', padding: 4 }} scope="col">
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {question.rows.map((row) => (
          <tr key={row.id}>
            <th
              style={{ textAlign: 'left', padding: 4 }}
              scope="row"
              data-mol-id={`survey-matrix-${question.id}-row-${row.id}`}
            >
              {row.label}
            </th>
            {question.columns.map((col) => {
              const selected = value[row.id] === col.value
              return (
                <td key={col.value} style={{ textAlign: 'center', padding: 4 }}>
                  <input
                    type="radio"
                    name={`${question.id}-${row.id}`}
                    checked={selected}
                    disabled={readOnly}
                    onChange={() => setRow(row.id, col.value)}
                    aria-label={`${row.label} - ${col.label}`}
                    data-mol-id={`survey-matrix-${question.id}-${row.id}-${col.value}`}
                  />
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
