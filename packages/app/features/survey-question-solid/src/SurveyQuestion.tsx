/**
 * Solid multi-type survey-question renderer — the counterpart of
 * `@molecule/app-survey-question-react`'s `SurveyQuestion`: the same props
 * (React names), the same DOM for the same input.
 *
 * @module
 */

import { type Component, createSignal, For, type JSX, Show } from 'solid-js'

import { FileDropzone } from '@molecule/app-file-dropzone-solid'
import { useTranslation } from '@molecule/app-solid'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import { reflectCheckedAtCreation } from './controlled-checked.js'
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

/** The shared text/date/number input style, React's inline object. */
const INPUT_STYLE: JSX.CSSProperties = {
  border: '1px solid var(--mol-color-border, rgba(128,128,128,0.35))',
  'border-radius': '8px',
  outline: 'none',
  width: '100%',
}

/** The textarea style: the input style plus vertical resizing. */
const TEXTAREA_STYLE: JSX.CSSProperties = { ...INPUT_STYLE, resize: 'vertical' }

/** The date input style (no width, as React renders it). */
const DATE_STYLE: JSX.CSSProperties = {
  border: '1px solid var(--mol-color-border, rgba(128,128,128,0.35))',
  'border-radius': '8px',
  outline: 'none',
}

/** The theme-token border both option rows share. */
const BORDER = 'var(--mol-color-border, rgba(128,128,128,0.35))'

/** The required marker's style, React's inline object. */
const REQUIRED_STYLE: JSX.CSSProperties = { color: '#ef4444', 'margin-left': '4px' }

/** The error paragraph's style, React's inline object. */
const ERROR_STYLE: JSX.CSSProperties = { color: '#ef4444' }

/** What every per-kind control builder receives. */
interface ControlContext {
  /** The resolved class map. */
  cm: UIClassMap
  /** The active translation function. */
  t: ReturnType<typeof useTranslation>['t']
  /** Reports a new answer value (no-op when read-only). */
  setValue: (value: SurveyAnswerValue) => void
  /** Whether every control is disabled. */
  readOnly: boolean | undefined
  /** Where the radio-group restore looks up the rendered inputs. */
  root: () => HTMLElement | undefined
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
 * Renders the single-pick radio-button group.
 *
 * @param question - The question.
 * @param value - The selected option value.
 * @param context - The control context.
 * @returns The radio-button group.
 */
function MultiChoiceSingleControl(props: {
  question: MultiChoiceSingleQuestion
  value: string
  context: ControlContext
}): JSX.Element {
  const { cm, readOnly, setValue } = props.context
  return (
    <div class={cm.stack(2)} role="radiogroup">
      {props.question.options.map((opt) => {
        const selected = props.value === opt.value
        return (
          <button
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={readOnly}
            onClick={() => setValue(opt.value)}
            class={cm.cn(
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
               fixed-height cm.button() tiers cannot do. The border is a theme
               token now; rgba(0,0,0,0.15) was invisible on a dark surface. */
            style={{
              'border-radius': '8px',
              border: `1px solid ${selected ? 'currentColor' : BORDER}`,
              opacity: readOnly ? '0.6' : '1',
              'text-align': 'left',
            }}
            data-mol-id={`survey-option-${props.question.id}-${opt.value}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Renders the multi-pick checkbox group.
 *
 * @param props - The question, its value and the control context.
 * @returns The checkbox group.
 */
function MultiChoiceMultiControl(props: {
  question: MultiChoiceMultiQuestion
  value: string[]
  context: ControlContext
}): JSX.Element {
  const { cm, readOnly, setValue } = props.context
  /**
   * Toggles an option in or out of the selected values array.
   *
   * @param option - The option value.
   */
  const toggle = (option: string): void => {
    if (readOnly) return
    if (props.value.includes(option)) setValue(props.value.filter((x) => x !== option))
    else setValue([...props.value, option])
  }
  return (
    <div class={cm.stack(2)} role="group">
      {props.question.options.map((opt) => {
        const selected = props.value.includes(opt.value)
        return (
          <button
            type="button"
            role="checkbox"
            aria-checked={selected}
            disabled={readOnly}
            onClick={() => toggle(opt.value)}
            class={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('sm'),
              readOnly ? undefined : cm.cursorPointer,
              cm.touchTargetCompact,
              selected ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
            )}
            /* mol-bespoke-button: full-width checkbox option ROW, not a CTA —
               same wrapping, left-aligned shape and theme-token border as the
               single-pick option row above. */
            style={{
              'border-radius': '8px',
              border: `1px solid ${selected ? 'currentColor' : BORDER}`,
              opacity: readOnly ? '0.6' : '1',
              'text-align': 'left',
            }}
            data-mol-id={`survey-option-${props.question.id}-${opt.value}`}
          >
            <span aria-hidden="true" style={{ display: 'inline-block', width: '16px' }}>
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
 * Renders the true/false toggle.
 *
 * @param props - The question, its value and the control context.
 * @returns The toggle control.
 */
function TrueFalseControl(props: {
  question: TrueFalseQuestion
  value: boolean | undefined
  context: ControlContext
}): JSX.Element {
  const { cm, readOnly, setValue, t } = props.context
  const trueLabel =
    props.question.trueLabel ?? t('surveyQuestion.trueFalse.true', {}, { defaultValue: 'True' })
  const falseLabel =
    props.question.falseLabel ?? t('surveyQuestion.trueFalse.false', {}, { defaultValue: 'False' })
  return (
    <div class={cm.flex({ gap: 'sm', align: 'center' })} role="radiogroup">
      <Button
        type="button"
        variant={props.value === true ? 'solid' : 'ghost'}
        color={props.value === true ? 'primary' : undefined}
        size="sm"
        disabled={readOnly}
        onClick={() => setValue(true)}
        data-mol-id={`survey-option-${props.question.id}-true`}
      >
        {trueLabel}
      </Button>
      <Button
        type="button"
        variant={props.value === false ? 'solid' : 'ghost'}
        color={props.value === false ? 'primary' : undefined}
        size="sm"
        disabled={readOnly}
        onClick={() => setValue(false)}
        data-mol-id={`survey-option-${props.question.id}-false`}
      >
        {falseLabel}
      </Button>
    </div>
  )
}

/**
 * Renders the short single-line text input.
 *
 * @param props - The question, its value and the control context.
 * @returns The input element.
 */
function ShortTextControl(props: {
  question: ShortTextQuestion
  value: string
  context: ControlContext
}): JSX.Element {
  const { cm, readOnly, setValue } = props.context
  return (
    <input
      type="text"
      value={props.value}
      attr:value={props.value}
      placeholder={props.question.placeholder}
      maxlength={props.question.maxLength}
      disabled={readOnly}
      on:input={(event) => {
        const input = event.currentTarget
        setValue(input.value)
        input.value = props.value
      }}
      aria-label={props.question.prompt}
      class={cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2))}
      style={INPUT_STYLE}
      data-mol-id={`survey-input-${props.question.id}`}
    />
  )
}

/**
 * Renders the long multi-line textarea.
 *
 * @param props - The question, its value and the control context.
 * @returns The textarea element.
 */
function LongTextControl(props: {
  question: LongTextQuestion
  value: string
  context: ControlContext
}): JSX.Element {
  const { cm, readOnly, setValue } = props.context
  return (
    <textarea
      value={props.value}
      placeholder={props.question.placeholder}
      maxlength={props.question.maxLength}
      rows={props.question.rows ?? 4}
      disabled={readOnly}
      on:input={(event) => {
        const textarea = event.currentTarget
        setValue(textarea.value)
        textarea.value = props.value
      }}
      aria-label={props.question.prompt}
      class={cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2))}
      style={TEXTAREA_STYLE}
      data-mol-id={`survey-input-${props.question.id}`}
    />
  )
}

/**
 * Renders the numeric input with an optional unit suffix.
 *
 * @param props - The question, its value and the control context.
 * @returns The numeric input row.
 */
function NumericControl(props: {
  question: NumericQuestion
  value: number | ''
  context: ControlContext
}): JSX.Element {
  const { cm, readOnly, setValue } = props.context
  const text = (): string => (props.value === '' ? '' : String(props.value))
  return (
    <div class={cm.flex({ align: 'center', gap: 'xs' })}>
      <input
        type="number"
        inputmode="decimal"
        value={text()}
        attr:value={text()}
        min={props.question.min}
        max={props.question.max}
        step={props.question.step}
        disabled={readOnly}
        on:input={(event) => {
          const input = event.currentTarget
          const raw = input.value
          if (raw === '') setValue('')
          else {
            const parsed = Number(raw)
            if (Number.isFinite(parsed)) setValue(parsed)
          }
          input.value = text()
        }}
        aria-label={props.question.prompt}
        class={cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2))}
        style={{ ...INPUT_STYLE, width: props.question.unit ? '12rem' : '100%' }}
        data-mol-id={`survey-input-${props.question.id}`}
      />
      <Show when={props.question.unit}>
        <span
          class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
          data-mol-id={`survey-input-${props.question.id}-unit`}
        >
          {props.question.unit}
        </span>
      </Show>
    </div>
  )
}

/**
 * Renders the rating-scale row.
 *
 * @param props - The question, its value and the control context.
 * @returns The rating-scale row.
 */
function RatingScaleControl(props: {
  question: RatingScaleQuestion
  value: number | undefined
  context: ControlContext
}): JSX.Element {
  const { cm, readOnly, setValue } = props.context
  const buttons = (): number[] => {
    const min = props.question.min ?? 1
    const max = props.question.max ?? 5
    const list: number[] = []
    for (let i = min; i <= max; i++) list.push(i)
    return list
  }
  return (
    <div class={cm.stack(1)}>
      <div class={cm.flex({ gap: 'xs', align: 'center' })} role="radiogroup">
        {buttons().map((n) => {
          const selected = props.value === n
          return (
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={readOnly}
              onClick={() => setValue(n)}
              class={cm.cn(
                cm.textSize('sm'),
                cm.roundedFull,
                readOnly ? undefined : cm.cursorPointer,
                cm.fontWeight(selected ? 'bold' : 'medium'),
              )}
              /* mol-bespoke-button: a 36×36 rating-scale POINT, not a CTA — the
               square geometry and pill radius are the scale's, and cm.button()
               has no square-icon tier at this size. */
              style={{
                border: `1px solid ${selected ? 'currentColor' : BORDER}`,
                width: '36px',
                height: '36px',
                opacity: readOnly ? '0.6' : '1',
                background: selected
                  ? 'color-mix(in srgb, currentColor 8%, transparent)'
                  : undefined,
              }}
              data-mol-id={`survey-option-${props.question.id}-${n}`}
            >
              {n}
            </button>
          )
        })}
      </div>
      <Show when={props.question.lowLabel || props.question.highLabel}>
        <div class={cm.flex({ justify: 'between' })}>
          <span class={cm.textSize('xs')}>{props.question.lowLabel}</span>
          <span class={cm.textSize('xs')}>{props.question.highLabel}</span>
        </div>
      </Show>
    </div>
  )
}

/**
 * Renders the NPS 0–10 row.
 *
 * @param props - The question, its value and the control context.
 * @returns The NPS row.
 */
function NPSControl(props: {
  question: NPSQuestion
  value: number | undefined
  context: ControlContext
}): JSX.Element {
  const { cm, readOnly, setValue, t } = props.context
  const lowLabel = (): string =>
    props.question.lowLabel ??
    t('surveyQuestion.nps.low', {}, { defaultValue: 'Not at all likely' })
  const highLabel = (): string =>
    props.question.highLabel ??
    t('surveyQuestion.nps.high', {}, { defaultValue: 'Extremely likely' })
  const buttons = (): number[] => {
    const list: number[] = []
    for (let i = 0; i <= 10; i++) list.push(i)
    return list
  }
  return (
    <div class={cm.stack(1)}>
      <div class={cm.flex({ gap: 'xs', align: 'center' })} role="radiogroup">
        {buttons().map((n) => {
          const selected = props.value === n
          return (
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={readOnly}
              onClick={() => setValue(n)}
              class={cm.cn(
                cm.textSize('sm'),
                readOnly ? undefined : cm.cursorPointer,
                cm.fontWeight(selected ? 'bold' : 'medium'),
              )}
              /* mol-bespoke-button: a 32×32 NPS scale POINT, not a CTA — same
               fixed scale geometry as the rating-scale point, sized down so
               eleven of them fit one row. */
              style={{
                border: `1px solid ${selected ? 'currentColor' : BORDER}`,
                'border-radius': '6px',
                width: '32px',
                height: '32px',
                opacity: readOnly ? '0.6' : '1',
                background: selected
                  ? 'color-mix(in srgb, currentColor 8%, transparent)'
                  : undefined,
              }}
              data-mol-id={`survey-option-${props.question.id}-${n}`}
            >
              {n}
            </button>
          )
        })}
      </div>
      <div class={cm.flex({ justify: 'between' })}>
        <span class={cm.textSize('xs')}>{lowLabel()}</span>
        <span class={cm.textSize('xs')}>{highLabel()}</span>
      </div>
    </div>
  )
}

/**
 * Renders the native date input.
 *
 * @param props - The question, its value and the control context.
 * @returns The date input.
 */
function DateControl(props: {
  question: DateQuestion
  value: string
  context: ControlContext
}): JSX.Element {
  const { cm, readOnly, setValue } = props.context
  return (
    <input
      type="date"
      value={props.value}
      attr:value={props.value}
      min={props.question.min}
      max={props.question.max}
      disabled={readOnly}
      on:input={(event) => {
        const input = event.currentTarget
        setValue(input.value)
        input.value = props.value
      }}
      aria-label={props.question.prompt}
      class={cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2))}
      style={DATE_STYLE}
      data-mol-id={`survey-input-${props.question.id}`}
    />
  )
}

/**
 * Renders the file-upload control: the dropzone plus the chosen-file list.
 *
 * @param props - The question, its files and the control context.
 * @returns The file dropzone wrapper.
 */
function FileUploadControl(props: {
  question: FileUploadQuestion
  value: File[]
  context: ControlContext
}): JSX.Element {
  const { cm, readOnly, setValue, t } = props.context
  return (
    <div class={cm.stack(2)}>
      <FileDropzone
        accept={props.question.accept}
        multiple={props.question.multiple}
        maxSize={props.question.maxSize}
        disabled={readOnly}
        onFiles={(files) => setValue(files)}
      />
      <Show when={props.value.length > 0}>
        <ul class={cm.stack(1)} data-mol-id={`survey-input-${props.question.id}-files`}>
          {props.value.map((file) => (
            <li class={cm.textSize('xs')}>{file.name}</li>
          ))}
        </ul>
      </Show>
      <Show when={props.value.length === 0}>
        <p class={cm.textSize('xs')}>
          {t('surveyQuestion.file.noFiles', {}, { defaultValue: 'No files selected.' })}
        </p>
      </Show>
    </div>
  )
}

/**
 * Renders the matrix table: one radio group per row.
 *
 * @param props - The question, its value and the control context.
 * @returns The matrix table.
 */
function MatrixControl(props: {
  question: MatrixQuestion
  value: Record<string, string>
  context: ControlContext
}): JSX.Element {
  const { cm, readOnly, setValue } = props.context
  /**
   * Updates a single matrix row's selected column value.
   *
   * @param rowId - The row the click came from.
   * @param column - The clicked column value.
   */
  const setRow = (rowId: string, column: string): void => {
    if (readOnly) return
    setValue({ ...props.value, [rowId]: column })
    // React restores every radio of the clicked name group to the controlled
    // value after the change event, so a click on another cell of the row
    // leaves the previously selected cell checked.
    const element = props.context.root()
    if (!element) return
    const name = `${props.question.id}-${rowId}`
    let index = 0
    for (const radio of Array.from(element.querySelectorAll('input[type="radio"]'))) {
      const input = radio as HTMLInputElement
      if (input.name !== name) continue
      input.checked = props.value[rowId] === props.question.columns[index]?.value
      index++
    }
  }
  return (
    <table
      class={cm.cn(cm.textSize('sm'))}
      style={{ 'border-collapse': 'collapse', width: '100%' }}
      data-mol-id={`survey-matrix-${props.question.id}`}
    >
      <thead>
        <tr>
          <th style={{ 'text-align': 'left', padding: '4px' }} />
          <For each={props.question.columns}>
            {(col) => (
              <th style={{ 'text-align': 'center', padding: '4px' }} scope="col">
                {col.label}
              </th>
            )}
          </For>
        </tr>
      </thead>
      <tbody>
        <For each={props.question.rows}>
          {(row) => (
            <tr>
              <th
                style={{ 'text-align': 'left', padding: '4px' }}
                scope="row"
                data-mol-id={`survey-matrix-${props.question.id}-row-${row.id}`}
              >
                {row.label}
              </th>
              <For each={props.question.columns}>
                {(col) => {
                  const isChecked = (): boolean => props.value[row.id] === col.value
                  return (
                    <td style={{ 'text-align': 'center', padding: '4px' }}>
                      <input
                        type="radio"
                        name={`${props.question.id}-${row.id}`}
                        checked={isChecked()}
                        ref={(element) => reflectCheckedAtCreation(element, isChecked())}
                        disabled={readOnly}
                        onChange={() => setRow(row.id, col.value)}
                        aria-label={`${row.label} - ${col.label}`}
                        data-mol-id={`survey-matrix-${props.question.id}-${row.id}-${col.value}`}
                      />
                    </td>
                  )
                }}
              </For>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  )
}

/**
 * Multi-type survey question renderer. Discriminates on `question.kind` and
 * renders the matching sub-component for one of 11 supported kinds.
 *
 * Solid counterpart of `@molecule/app-survey-question-react`'s
 * `SurveyQuestion` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @param props - Component props (see {@link SurveyQuestionProps}).
 * @returns The rendered question.
 */
export const SurveyQuestion: Component<SurveyQuestionProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [error, setError] = createSignal<string | null>(null)
  let rootEl: HTMLDivElement | undefined

  /**
   * Reports a new answer value: clears the error and calls `onChange`.
   *
   * @param next - The new value.
   */
  const setValue = (next: SurveyAnswerValue): void => {
    if (props.readOnly) return
    setError(null)
    props.onChange?.(next)
  }

  /** Validates the required field and calls `onSubmit`. */
  const handleSubmit = (): void => {
    if (props.readOnly) return
    if (props.question.required && !hasAnswer(props.question.kind, props.value)) {
      setError(
        t(
          'surveyQuestion.required',
          {},
          {
            defaultValue: 'This question requires an answer.',
          },
        ),
      )
      return
    }
    setError(null)
    props.onSubmit?.(props.value as SurveyAnswerValue)
  }

  /**
   * Builds the per-kind control.
   *
   * @returns The control element, or null for an unsupported kind.
   */
  const control = (): JSX.Element => {
    const context: ControlContext = {
      cm,
      t,
      setValue,
      readOnly: props.readOnly,
      root: () => rootEl,
    }
    switch (props.question.kind) {
      case 'multi-choice-single':
        return (
          <MultiChoiceSingleControl
            question={props.question}
            value={(props.value as string) ?? ''}
            context={context}
          />
        )
      case 'multi-choice-multi':
        return (
          <MultiChoiceMultiControl
            question={props.question}
            value={(props.value as string[]) ?? []}
            context={context}
          />
        )
      case 'true-false':
        return (
          <TrueFalseControl
            question={props.question}
            value={props.value as boolean | undefined}
            context={context}
          />
        )
      case 'short-text':
        return (
          <ShortTextControl
            question={props.question}
            value={(props.value as string) ?? ''}
            context={context}
          />
        )
      case 'long-text':
        return (
          <LongTextControl
            question={props.question}
            value={(props.value as string) ?? ''}
            context={context}
          />
        )
      case 'numeric':
        return (
          <NumericControl
            question={props.question}
            value={(props.value as number | '') ?? ''}
            context={context}
          />
        )
      case 'rating-scale':
        return (
          <RatingScaleControl
            question={props.question}
            value={props.value as number | undefined}
            context={context}
          />
        )
      case 'nps':
        return (
          <NPSControl
            question={props.question}
            value={props.value as number | undefined}
            context={context}
          />
        )
      case 'date':
        return (
          <DateControl
            question={props.question}
            value={(props.value as string) ?? ''}
            context={context}
          />
        )
      case 'file-upload':
        return (
          <FileUploadControl
            question={props.question}
            value={(props.value as File[]) ?? []}
            context={context}
          />
        )
      case 'matrix':
        return (
          <MatrixControl
            question={props.question}
            value={(props.value as Record<string, string>) ?? {}}
            context={context}
          />
        )
      default:
        return null
    }
  }

  return (
    <div
      ref={(element) => {
        rootEl = element
      }}
      class={cm.cn(cm.stack(3), props.className)}
      data-mol-id={`survey-question-${props.question.id}`}
      data-kind={props.question.kind}
    >
      <header class={cm.stack(1)}>
        <h3 class={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {props.question.prompt}
          <Show when={props.question.required}>
            <span
              aria-label={t('surveyQuestion.requiredIndicator', {}, { defaultValue: 'required' })}
              style={REQUIRED_STYLE}
              data-mol-id={`survey-question-${props.question.id}-required`}
            >
              *
            </span>
          </Show>
        </h3>
        <Show when={props.question.description}>
          <p class={cm.textSize('sm')}>{props.question.description}</p>
        </Show>
      </header>
      <div data-mol-id={`survey-question-${props.question.id}-input`}>{control()}</div>
      <Show when={props.question.helpText}>
        <p class={cm.textSize('xs')} data-mol-id={`survey-question-${props.question.id}-help`}>
          {props.question.helpText}
        </p>
      </Show>
      <Show when={error()}>
        <p
          class={cm.textSize('xs')}
          style={ERROR_STYLE}
          role="alert"
          data-mol-id={`survey-question-${props.question.id}-error`}
        >
          {error()}
        </p>
      </Show>
      <Show when={props.onSubmit && !props.readOnly}>
        <div>
          <Button type="button" variant="solid" color="primary" onClick={handleSubmit}>
            {t('surveyQuestion.submit', {}, { defaultValue: 'Submit' })}
          </Button>
        </div>
      </Show>
    </div>
  )
}
