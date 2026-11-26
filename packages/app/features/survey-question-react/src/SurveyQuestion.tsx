import type { ReactElement } from 'react'
import { useCallback, useState } from 'react'

import { FileDropzone } from '@molecule/app-file-dropzone-react'
import type { PickedFile } from '@molecule/app-filesystem'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import {
  Box,
  CheckField,
  Pressable,
  TableBox,
  TableCell,
  Text,
  TextField,
} from '@molecule/app-ui-react/elements'

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
  /** Called on valid submission. An unanswered optional question submits undefined. */
  onSubmit?: (value: SurveyAnswerValue | undefined) => void
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
export function SurveyQuestion(props: SurveyQuestionProps): ReactElement {
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
    onSubmit?.(value)
  }, [question, readOnly, t, value, onSubmit])

  return (
    <Box
      as="div"
      className={cm.cn(cm.stack(3), className)}
      data-mol-id={`survey-question-${question.id}`}
      data-kind={question.kind}
    >
      <Box as="header" className={cm.stack(1)}>
        <Text as="h3" className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {question.prompt}
          {question.required && (
            <Text
              as="span"
              aria-label={t('surveyQuestion.requiredIndicator', {}, { defaultValue: 'required' })}
              webStyle={{ color: '#ef4444', marginLeft: 4 }}
              data-mol-id={`survey-question-${question.id}-required`}
            >
              *
            </Text>
          )}
        </Text>
        {question.description && (
          <Text as="p" className={cm.textSize('sm')}>
            {question.description}
          </Text>
        )}
      </Box>
      <Box as="div" data-mol-id={`survey-question-${question.id}-input`}>
        {renderControl(question, value, setValue, readOnly)}
      </Box>
      {question.helpText && (
        <Text
          as="p"
          className={cm.textSize('xs')}
          data-mol-id={`survey-question-${question.id}-help`}
        >
          {question.helpText}
        </Text>
      )}
      {error && (
        <Text
          as="p"
          className={cm.textSize('xs')}
          webStyle={{ color: '#ef4444' }}
          role="alert"
          data-mol-id={`survey-question-${question.id}-error`}
        >
          {error}
        </Text>
      )}
      {onSubmit && !readOnly && (
        <Box as="div">
          <Button type="button" variant="solid" color="primary" onClick={handleSubmit}>
            {t('surveyQuestion.submit', {}, { defaultValue: 'Submit' })}
          </Button>
        </Box>
      )}
    </Box>
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
      return typeof value === 'object' && Object.keys(value).length > 0
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

/** Narrows the answer's two ordered collection types, including the readonly file batch. */
function isAnswerList(
  value: SurveyAnswerValue | undefined,
): value is string[] | readonly PickedFile[] {
  return Array.isArray(value)
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
): ReactElement | null {
  switch (q.kind) {
    case 'multi-choice-single':
      return (
        <MultiChoiceSingleControl
          question={q}
          value={typeof value === 'string' ? value : ''}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'multi-choice-multi':
      return (
        <MultiChoiceMultiControl
          question={q}
          value={isAnswerList(value) ? value.filter((entry) => typeof entry === 'string') : []}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'true-false':
      return (
        <TrueFalseControl
          question={q}
          value={typeof value === 'boolean' ? value : undefined}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'short-text':
      return (
        <ShortTextControl
          question={q}
          value={typeof value === 'string' ? value : ''}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'long-text':
      return (
        <LongTextControl
          question={q}
          value={typeof value === 'string' ? value : ''}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'numeric':
      return (
        <NumericControl
          question={q}
          value={typeof value === 'number' ? value : ''}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'rating-scale':
      return (
        <RatingScaleControl
          question={q}
          value={typeof value === 'number' ? value : undefined}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'nps':
      return (
        <NPSControl
          question={q}
          value={typeof value === 'number' ? value : undefined}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'date':
      return (
        <DateControl
          question={q}
          value={typeof value === 'string' ? value : ''}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'file-upload':
      return (
        <FileUploadControl
          question={q}
          value={isAnswerList(value) ? value.filter((entry) => typeof entry !== 'string') : []}
          onChange={setValue}
          readOnly={readOnly}
        />
      )
    case 'matrix':
      return (
        <MatrixControl
          question={q}
          value={value && typeof value === 'object' && !isAnswerList(value) ? value : {}}
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
}: ControlProps<MultiChoiceSingleQuestion, string>): ReactElement {
  const cm = getClassMap()
  return (
    <Box as="div" className={cm.stack(2)} role="radiogroup">
      {question.options.map((opt) => {
        const selected = value === opt.value
        return (
          <Pressable
            as="button"
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
              readOnly ? undefined : cm.cursorPointer,
              cm.touchTargetCompact,
              selected ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
            )}
            /* mol-bespoke-button: full-width radio option ROW, not a CTA — it
               wraps to multiple lines and stays left-aligned, which the
               fixed-height `cm.button()` tiers cannot do. The resting border
               is a theme token now; `rgba(0,0,0,0.15)` was invisible on a dark
               surface. */
            webStyle={{
              borderRadius: 8,
              border: `1px solid ${
                selected ? 'currentColor' : 'var(--mol-color-border, rgba(128,128,128,0.35))'
              }`,
              opacity: readOnly ? 0.6 : 1,
              textAlign: 'left',
            }}
            data-mol-id={`survey-option-${question.id}-${opt.value}`}
          >
            {opt.label}
          </Pressable>
        )
      })}
    </Box>
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
}: ControlProps<MultiChoiceMultiQuestion, string[]>): ReactElement {
  const cm = getClassMap()
  /**
   * Toggles an option in or out of the selected values array.
   */
  function toggle(v: string): void {
    if (readOnly) return
    if (value.includes(v)) onChange(value.filter((x) => x !== v))
    else onChange([...value, v])
  }
  return (
    <Box as="div" className={cm.stack(2)} role="group">
      {question.options.map((opt) => {
        const selected = value.includes(opt.value)
        return (
          <Pressable
            as="button"
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
              readOnly ? undefined : cm.cursorPointer,
              cm.touchTargetCompact,
              selected ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
            )}
            /* mol-bespoke-button: full-width checkbox option ROW, not a CTA —
               same wrapping, left-aligned shape and theme-token border as
               MultiChoiceSingleControl above. */
            webStyle={{
              borderRadius: 8,
              border: `1px solid ${
                selected ? 'currentColor' : 'var(--mol-color-border, rgba(128,128,128,0.35))'
              }`,
              opacity: readOnly ? 0.6 : 1,
              textAlign: 'left',
            }}
            data-mol-id={`survey-option-${question.id}-${opt.value}`}
          >
            <Text as="span" aria-hidden webStyle={{ display: 'inline-block', width: 16 }}>
              {selected ? '☑' : '☐'}
            </Text>
            <Text as="span">{opt.label}</Text>
          </Pressable>
        )
      })}
    </Box>
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
}: ControlProps<TrueFalseQuestion, boolean | undefined>): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()
  const trueLabel =
    question.trueLabel ?? t('surveyQuestion.trueFalse.true', {}, { defaultValue: 'True' })
  const falseLabel =
    question.falseLabel ?? t('surveyQuestion.trueFalse.false', {}, { defaultValue: 'False' })
  return (
    <Box as="div" className={cm.flex({ gap: 'sm', align: 'center' })} role="radiogroup">
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
    </Box>
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
}: ControlProps<ShortTextQuestion, string>): ReactElement {
  const cm = getClassMap()
  return (
    <TextField
      as="input"
      type="text"
      value={value}
      placeholder={question.placeholder}
      maxLength={question.maxLength}
      disabled={readOnly}
      onValueChange={onChange}
      aria-label={question.prompt}
      className={cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2))}
      webStyle={{
        border: '1px solid var(--mol-color-border, rgba(128,128,128,0.35))',
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
}: ControlProps<LongTextQuestion, string>): ReactElement {
  const cm = getClassMap()
  return (
    <TextField
      as="textarea"
      value={value}
      placeholder={question.placeholder}
      maxLength={question.maxLength}
      rows={question.rows ?? 4}
      disabled={readOnly}
      onValueChange={onChange}
      aria-label={question.prompt}
      className={cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2))}
      webStyle={{
        border: '1px solid var(--mol-color-border, rgba(128,128,128,0.35))',
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
}: ControlProps<NumericQuestion, number | ''>): ReactElement {
  const cm = getClassMap()
  return (
    <Box as="div" className={cm.flex({ align: 'center', gap: 'xs' })}>
      <TextField
        as="input"
        type="number"
        inputMode="decimal"
        value={value === '' ? '' : String(value)}
        min={question.min}
        max={question.max}
        step={question.step}
        disabled={readOnly}
        onValueChange={(raw) => {
          if (raw === '') {
            onChange('')
            return
          }
          const n = Number(raw)
          if (Number.isFinite(n)) onChange(n)
        }}
        aria-label={question.prompt}
        className={cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2))}
        webStyle={{
          border: '1px solid var(--mol-color-border, rgba(128,128,128,0.35))',
          borderRadius: 8,
          outline: 'none',
          width: question.unit ? '12rem' : '100%',
        }}
        data-mol-id={`survey-input-${question.id}`}
      />
      {question.unit && (
        <Text
          as="span"
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
          data-mol-id={`survey-input-${question.id}-unit`}
        >
          {question.unit}
        </Text>
      )}
    </Box>
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
}: ControlProps<RatingScaleQuestion, number | undefined>): ReactElement {
  const cm = getClassMap()
  const min = question.min ?? 1
  const max = question.max ?? 5
  const buttons: number[] = []
  for (let i = min; i <= max; i++) buttons.push(i)
  return (
    <Box as="div" className={cm.stack(1)}>
      <Box as="div" className={cm.flex({ gap: 'xs', align: 'center' })} role="radiogroup">
        {buttons.map((n) => {
          const selected = value === n
          return (
            <Pressable
              as="button"
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={readOnly}
              onClick={() => onChange(n)}
              className={cm.cn(
                cm.textSize('sm'),
                cm.roundedFull,
                readOnly ? undefined : cm.cursorPointer,
                cm.fontWeight(selected ? 'bold' : 'medium'),
              )}
              /* mol-bespoke-button: a 36×36 rating-scale POINT, not a CTA —
                 the square geometry and pill radius are the scale's, and
                 `cm.button()` has no square-icon tier at this size. Border and
                 fill are theme tokens; the old `rgba(0,0,0,…)` pair washed out
                 on a dark surface. */
              webStyle={{
                border: `1px solid ${
                  selected ? 'currentColor' : 'var(--mol-color-border, rgba(128,128,128,0.35))'
                }`,
                width: 36,
                height: 36,
                opacity: readOnly ? 0.6 : 1,
                background: selected
                  ? 'color-mix(in srgb, currentColor 8%, transparent)'
                  : undefined,
              }}
              data-mol-id={`survey-option-${question.id}-${n}`}
            >
              {n}
            </Pressable>
          )
        })}
      </Box>
      {(question.lowLabel || question.highLabel) && (
        <Box as="div" className={cm.flex({ justify: 'between' })}>
          <Text as="span" className={cm.textSize('xs')}>
            {question.lowLabel}
          </Text>
          <Text as="span" className={cm.textSize('xs')}>
            {question.highLabel}
          </Text>
        </Box>
      )}
    </Box>
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
}: ControlProps<NPSQuestion, number | undefined>): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()
  const lowLabel =
    question.lowLabel ?? t('surveyQuestion.nps.low', {}, { defaultValue: 'Not at all likely' })
  const highLabel =
    question.highLabel ?? t('surveyQuestion.nps.high', {}, { defaultValue: 'Extremely likely' })
  const buttons: number[] = []
  for (let i = 0; i <= 10; i++) buttons.push(i)
  return (
    <Box as="div" className={cm.stack(1)}>
      <Box as="div" className={cm.flex({ gap: 'xs', align: 'center' })} role="radiogroup">
        {buttons.map((n) => {
          const selected = value === n
          return (
            <Pressable
              as="button"
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={readOnly}
              onClick={() => onChange(n)}
              className={cm.cn(
                cm.textSize('sm'),
                readOnly ? undefined : cm.cursorPointer,
                cm.fontWeight(selected ? 'bold' : 'medium'),
              )}
              /* mol-bespoke-button: a 32×32 NPS scale POINT, not a CTA — same
                 fixed scale geometry as RatingScaleControl, sized down so
                 eleven of them fit one row. */
              webStyle={{
                border: `1px solid ${
                  selected ? 'currentColor' : 'var(--mol-color-border, rgba(128,128,128,0.35))'
                }`,
                borderRadius: 6,
                width: 32,
                height: 32,
                opacity: readOnly ? 0.6 : 1,
                background: selected
                  ? 'color-mix(in srgb, currentColor 8%, transparent)'
                  : undefined,
              }}
              data-mol-id={`survey-option-${question.id}-${n}`}
            >
              {n}
            </Pressable>
          )
        })}
      </Box>
      <Box as="div" className={cm.flex({ justify: 'between' })}>
        <Text as="span" className={cm.textSize('xs')}>
          {lowLabel}
        </Text>
        <Text as="span" className={cm.textSize('xs')}>
          {highLabel}
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Native date input.
 *
 * @param props - Control props.
 * @returns The date input.
 */
function DateControl({
  question,
  value,
  onChange,
  readOnly,
}: ControlProps<DateQuestion, string>): ReactElement {
  const cm = getClassMap()
  return (
    <TextField
      as="input"
      type="date"
      value={value}
      min={question.min}
      max={question.max}
      disabled={readOnly}
      onValueChange={onChange}
      aria-label={question.prompt}
      className={cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2))}
      webStyle={{
        border: '1px solid var(--mol-color-border, rgba(128,128,128,0.35))',
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
}: ControlProps<FileUploadQuestion, readonly PickedFile[]>): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Box as="div" className={cm.stack(2)}>
      <FileDropzone
        accept={question.accept}
        multiple={question.multiple}
        maxSize={question.maxSize}
        disabled={readOnly}
        onFiles={onChange}
      />
      {value.length > 0 && (
        <Box as="ul" className={cm.stack(1)} data-mol-id={`survey-input-${question.id}-files`}>
          {value.map((f, i) => (
            <Text as="li" key={`${f.name}-${i}`} className={cm.textSize('xs')}>
              {f.name}
            </Text>
          ))}
        </Box>
      )}
      {value.length === 0 && (
        <Text as="p" className={cm.textSize('xs')}>
          {t('surveyQuestion.file.noFiles', {}, { defaultValue: 'No files selected.' })}
        </Text>
      )}
    </Box>
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
}: ControlProps<MatrixQuestion, Record<string, string>>): ReactElement {
  const cm = getClassMap()
  /**
   * Updates a single matrix row's selected column value.
   */
  function setRow(rowId: string, colValue: string): void {
    if (readOnly) return
    onChange({ ...value, [rowId]: colValue })
  }
  return (
    <TableBox
      as="table"
      className={cm.cn(cm.textSize('sm'))}
      webStyle={{ borderCollapse: 'collapse', width: '100%' }}
      data-mol-id={`survey-matrix-${question.id}`}
    >
      <TableBox as="thead">
        <TableBox as="tr">
          <TableCell as="th" webStyle={{ textAlign: 'left', padding: 4 }} />
          {question.columns.map((col) => (
            <TableCell
              as="th"
              key={col.value}
              webStyle={{ textAlign: 'center', padding: 4 }}
              scope="col"
            >
              {col.label}
            </TableCell>
          ))}
        </TableBox>
      </TableBox>
      <TableBox as="tbody">
        {question.rows.map((row) => (
          <TableBox as="tr" key={row.id}>
            <TableCell
              as="th"
              webStyle={{ textAlign: 'left', padding: 4 }}
              scope="row"
              data-mol-id={`survey-matrix-${question.id}-row-${row.id}`}
            >
              {row.label}
            </TableCell>
            {question.columns.map((col) => {
              const selected = value[row.id] === col.value
              return (
                <TableCell as="td" key={col.value} webStyle={{ textAlign: 'center', padding: 4 }}>
                  <CheckField
                    as="input"
                    type="radio"
                    name={`${question.id}-${row.id}`}
                    checked={selected}
                    disabled={readOnly}
                    onCheckedChange={() => setRow(row.id, col.value)}
                    aria-label={`${row.label} - ${col.label}`}
                    data-mol-id={`survey-matrix-${question.id}-${row.id}-${col.value}`}
                  />
                </TableCell>
              )
            })}
          </TableBox>
        ))}
      </TableBox>
    </TableBox>
  )
}
