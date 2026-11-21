/**
 * Vue multi-type survey-question renderer — the counterpart of
 * `@molecule/app-survey-question-react`'s `SurveyQuestion`: the same props
 * (React names), the same DOM for the same input.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onMounted,
  type PropType,
  type Ref,
  ref,
  type VNode,
  watch,
  withDirectives,
} from 'vue'

import { FileDropzone } from '@molecule/app-file-dropzone-vue'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import { vControlledChecked } from './controlled-checked.js'
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

/** The shared text/date/number input style, React's inline object. */
const INPUT_STYLE = {
  border: '1px solid var(--mol-color-border, rgba(128,128,128,0.35))',
  'border-radius': '8px',
  outline: 'none',
  width: '100%',
}

/** The textarea style: the input style plus vertical resizing. */
const TEXTAREA_STYLE = { ...INPUT_STYLE, resize: 'vertical' }

/** The date input style (no width, as React renders it). */
const DATE_STYLE = {
  border: '1px solid var(--mol-color-border, rgba(128,128,128,0.35))',
  'border-radius': '8px',
  outline: 'none',
}

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
 * Builds the single-pick radio-button group.
 *
 * @param question - The question.
 * @param value - The selected option value.
 * @param context - The control context.
 * @returns The radio-button group.
 */
function multiChoiceSingle(
  question: MultiChoiceSingleQuestion,
  value: string,
  context: ControlContext,
): VNode {
  const { cm, readOnly, setValue } = context
  return h(
    'div',
    { class: cm.stack(2), role: 'radiogroup' },
    question.options.map((opt) => {
      const selected = value === opt.value
      return h(
        'button',
        {
          key: opt.value,
          type: 'button',
          role: 'radio',
          'aria-checked': selected,
          disabled: readOnly,
          onClick: () => setValue(opt.value),
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            readOnly ? undefined : cm.cursorPointer,
            cm.touchTargetCompact,
            selected ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
          ),
          style: {
            'border-radius': '8px',
            border: `1px solid ${
              selected ? 'currentColor' : 'var(--mol-color-border, rgba(128,128,128,0.35))'
            }`,
            opacity: readOnly ? '0.6' : '1',
            'text-align': 'left',
          },
          'data-mol-id': `survey-option-${question.id}-${opt.value}`,
        },
        [opt.label],
      )
    }),
  )
}

/**
 * Builds the multi-pick checkbox group.
 *
 * @param question - The question.
 * @param value - The selected option values.
 * @param context - The control context.
 * @returns The checkbox group.
 */
function multiChoiceMulti(
  question: MultiChoiceMultiQuestion,
  value: string[],
  context: ControlContext,
): VNode {
  const { cm, readOnly, setValue } = context
  /**
   * Toggles an option in or out of the selected values array.
   *
   * @param option - The option value.
   */
  const toggle = (option: string): void => {
    if (readOnly) return
    if (value.includes(option)) setValue(value.filter((x) => x !== option))
    else setValue([...value, option])
  }
  return h(
    'div',
    { class: cm.stack(2), role: 'group' },
    question.options.map((opt) => {
      const selected = value.includes(opt.value)
      return h(
        'button',
        {
          key: opt.value,
          type: 'button',
          role: 'checkbox',
          'aria-checked': selected,
          disabled: readOnly,
          onClick: () => toggle(opt.value),
          class: cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.textSize('sm'),
            readOnly ? undefined : cm.cursorPointer,
            cm.touchTargetCompact,
            selected ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
          ),
          style: {
            'border-radius': '8px',
            border: `1px solid ${
              selected ? 'currentColor' : 'var(--mol-color-border, rgba(128,128,128,0.35))'
            }`,
            opacity: readOnly ? '0.6' : '1',
            'text-align': 'left',
          },
          'data-mol-id': `survey-option-${question.id}-${opt.value}`,
        },
        [
          h(
            'span',
            {
              'aria-hidden': true,
              style: { display: 'inline-block', width: '16px' },
            },
            selected ? '☑' : '☐',
          ),
          h('span', [opt.label]),
        ],
      )
    }),
  )
}

/**
 * Builds the true/false toggle.
 *
 * @param question - The question.
 * @param value - The current answer.
 * @param context - The control context.
 * @returns The toggle control.
 */
function trueFalse(
  question: TrueFalseQuestion,
  value: boolean | undefined,
  context: ControlContext,
): VNode {
  const { cm, readOnly, setValue, t } = context
  const trueLabel =
    question.trueLabel ?? t('surveyQuestion.trueFalse.true', {}, { defaultValue: 'True' })
  const falseLabel =
    question.falseLabel ?? t('surveyQuestion.trueFalse.false', {}, { defaultValue: 'False' })
  return h('div', { class: cm.flex({ gap: 'sm', align: 'center' }), role: 'radiogroup' }, [
    h(
      Button,
      {
        type: 'button',
        variant: value === true ? 'solid' : 'ghost',
        color: value === true ? 'primary' : undefined,
        size: 'sm',
        disabled: readOnly,
        onClick: () => setValue(true),
        'data-mol-id': `survey-option-${question.id}-true`,
      },
      () => [trueLabel],
    ),
    h(
      Button,
      {
        type: 'button',
        variant: value === false ? 'solid' : 'ghost',
        color: value === false ? 'primary' : undefined,
        size: 'sm',
        disabled: readOnly,
        onClick: () => setValue(false),
        'data-mol-id': `survey-option-${question.id}-false`,
      },
      () => [falseLabel],
    ),
  ])
}

/**
 * Builds the short single-line text input.
 *
 * @param question - The question.
 * @param value - The current text.
 * @param context - The control context.
 * @returns The input element.
 */
function shortText(question: ShortTextQuestion, value: string, context: ControlContext): VNode {
  const { cm, readOnly, setValue } = context
  return h('input', {
    type: 'text',
    value,
    placeholder: question.placeholder,
    maxlength: question.maxLength,
    disabled: readOnly,
    onInput: (event: Event) => {
      const input = event.target as HTMLInputElement
      setValue(input.value)
      input.value = value
    },
    'aria-label': question.prompt,
    class: cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2)),
    style: INPUT_STYLE,
    'data-mol-id': `survey-input-${question.id}`,
  })
}

/**
 * Builds the long multi-line textarea.
 *
 * @param question - The question.
 * @param value - The current text.
 * @param context - The control context.
 * @param element - The element ref the created textarea lands in.
 * @returns The textarea element.
 */
function longText(
  question: LongTextQuestion,
  value: string,
  context: ControlContext,
  element: Ref<HTMLTextAreaElement | null>,
): VNode {
  const { cm, readOnly, setValue } = context
  return h('textarea', {
    ref: element,
    placeholder: question.placeholder,
    maxlength: question.maxLength,
    rows: question.rows ?? 4,
    disabled: readOnly,
    onInput: (event: Event) => {
      const textarea = event.target as HTMLTextAreaElement
      setValue(textarea.value)
      textarea.value = value
    },
    'aria-label': question.prompt,
    class: cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2)),
    style: TEXTAREA_STYLE,
    'data-mol-id': `survey-input-${question.id}`,
  })
}

/**
 * Builds the numeric input with an optional unit suffix.
 *
 * @param question - The question.
 * @param value - The current number, or `''` when empty.
 * @param context - The control context.
 * @returns The numeric input row.
 */
function numeric(question: NumericQuestion, value: number | '', context: ControlContext): VNode {
  const { cm, readOnly, setValue } = context
  const text = value === '' ? '' : String(value)
  return h('div', { class: cm.flex({ align: 'center', gap: 'xs' }) }, [
    h('input', {
      type: 'number',
      inputmode: 'decimal',
      value: text,
      min: question.min,
      max: question.max,
      step: question.step,
      disabled: readOnly,
      onInput: (event: Event) => {
        const input = event.target as HTMLInputElement
        const raw = input.value
        if (raw === '') setValue('')
        else {
          const parsed = Number(raw)
          if (Number.isFinite(parsed)) setValue(parsed)
        }
        input.value = text
      },
      'aria-label': question.prompt,
      class: cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2)),
      style: { ...INPUT_STYLE, width: question.unit ? '12rem' : '100%' },
      'data-mol-id': `survey-input-${question.id}`,
    }),
    question.unit
      ? h(
          'span',
          {
            class: cm.cn(cm.textSize('sm'), cm.fontWeight('medium')),
            'data-mol-id': `survey-input-${question.id}-unit`,
          },
          [question.unit],
        )
      : null,
  ])
}

/**
 * Builds the rating-scale row.
 *
 * @param question - The question.
 * @param value - The selected value.
 * @param context - The control context.
 * @returns The rating-scale row.
 */
function ratingScale(
  question: RatingScaleQuestion,
  value: number | undefined,
  context: ControlContext,
): VNode {
  const { cm, readOnly, setValue } = context
  const min = question.min ?? 1
  const max = question.max ?? 5
  const buttons: number[] = []
  for (let i = min; i <= max; i++) buttons.push(i)
  return h('div', { class: cm.stack(1) }, [
    h(
      'div',
      { class: cm.flex({ gap: 'xs', align: 'center' }), role: 'radiogroup' },
      buttons.map((n) => {
        const selected = value === n
        return h(
          'button',
          {
            key: n,
            type: 'button',
            role: 'radio',
            'aria-checked': selected,
            disabled: readOnly,
            onClick: () => setValue(n),
            class: cm.cn(
              cm.textSize('sm'),
              cm.roundedFull,
              readOnly ? undefined : cm.cursorPointer,
              cm.fontWeight(selected ? 'bold' : 'medium'),
            ),
            style: {
              border: `1px solid ${
                selected ? 'currentColor' : 'var(--mol-color-border, rgba(128,128,128,0.35))'
              }`,
              width: '36px',
              height: '36px',
              opacity: readOnly ? '0.6' : '1',
              background: selected ? 'color-mix(in srgb, currentColor 8%, transparent)' : undefined,
            },
            'data-mol-id': `survey-option-${question.id}-${n}`,
          },
          [String(n)],
        )
      }),
    ),
    question.lowLabel || question.highLabel
      ? h('div', { class: cm.flex({ justify: 'between' }) }, [
          h('span', { class: cm.textSize('xs') }, [question.lowLabel]),
          h('span', { class: cm.textSize('xs') }, [question.highLabel]),
        ])
      : null,
  ])
}

/**
 * Builds the NPS 0–10 row.
 *
 * @param question - The question.
 * @param value - The selected value.
 * @param context - The control context.
 * @returns The NPS row.
 */
function nps(question: NPSQuestion, value: number | undefined, context: ControlContext): VNode {
  const { cm, readOnly, setValue, t } = context
  const lowLabel =
    question.lowLabel ?? t('surveyQuestion.nps.low', {}, { defaultValue: 'Not at all likely' })
  const highLabel =
    question.highLabel ?? t('surveyQuestion.nps.high', {}, { defaultValue: 'Extremely likely' })
  const buttons: number[] = []
  for (let i = 0; i <= 10; i++) buttons.push(i)
  return h('div', { class: cm.stack(1) }, [
    h(
      'div',
      { class: cm.flex({ gap: 'xs', align: 'center' }), role: 'radiogroup' },
      buttons.map((n) => {
        const selected = value === n
        return h(
          'button',
          {
            key: n,
            type: 'button',
            role: 'radio',
            'aria-checked': selected,
            disabled: readOnly,
            onClick: () => setValue(n),
            class: cm.cn(
              cm.textSize('sm'),
              readOnly ? undefined : cm.cursorPointer,
              cm.fontWeight(selected ? 'bold' : 'medium'),
            ),
            style: {
              border: `1px solid ${
                selected ? 'currentColor' : 'var(--mol-color-border, rgba(128,128,128,0.35))'
              }`,
              'border-radius': '6px',
              width: '32px',
              height: '32px',
              opacity: readOnly ? '0.6' : '1',
              background: selected ? 'color-mix(in srgb, currentColor 8%, transparent)' : undefined,
            },
            'data-mol-id': `survey-option-${question.id}-${n}`,
          },
          [String(n)],
        )
      }),
    ),
    h('div', { class: cm.flex({ justify: 'between' }) }, [
      h('span', { class: cm.textSize('xs') }, [lowLabel]),
      h('span', { class: cm.textSize('xs') }, [highLabel]),
    ]),
  ])
}

/**
 * Builds the native date input.
 *
 * @param question - The question.
 * @param value - The current ISO date.
 * @param context - The control context.
 * @returns The date input.
 */
function date(question: DateQuestion, value: string, context: ControlContext): VNode {
  const { cm, readOnly, setValue } = context
  return h('input', {
    type: 'date',
    value,
    min: question.min,
    max: question.max,
    disabled: readOnly,
    onInput: (event: Event) => {
      const input = event.target as HTMLInputElement
      setValue(input.value)
      input.value = value
    },
    'aria-label': question.prompt,
    class: cm.cn(cm.textSize('base'), cm.sp('px', 3), cm.sp('py', 2)),
    style: DATE_STYLE,
    'data-mol-id': `survey-input-${question.id}`,
  })
}

/**
 * Builds the file-upload control: the dropzone plus the chosen-file list.
 *
 * @param question - The question.
 * @param value - The chosen files.
 * @param context - The control context.
 * @returns The file dropzone wrapper.
 */
function fileUpload(question: FileUploadQuestion, value: File[], context: ControlContext): VNode {
  const { cm, readOnly, setValue, t } = context
  return h('div', { class: cm.stack(2) }, [
    h(FileDropzone, {
      accept: question.accept,
      multiple: question.multiple,
      maxSize: question.maxSize,
      disabled: readOnly,
      onFiles: (files: File[]) => setValue(files),
    }),
    value.length > 0
      ? h(
          'ul',
          { class: cm.stack(1), 'data-mol-id': `survey-input-${question.id}-files` },
          value.map((file, index) =>
            h('li', { key: `${file.name}-${index}`, class: cm.textSize('xs') }, [file.name]),
          ),
        )
      : null,
    value.length === 0
      ? h('p', { class: cm.textSize('xs') }, [
          t('surveyQuestion.file.noFiles', {}, { defaultValue: 'No files selected.' }),
        ])
      : null,
  ])
}

/**
 * Builds the matrix table: one radio group per row.
 *
 * @param question - The question.
 * @param value - The selected column value per row id.
 * @param context - The control context.
 * @param root - The element ref the component's root lands in.
 * @returns The matrix table.
 */
function matrix(
  question: MatrixQuestion,
  value: Record<string, string>,
  context: ControlContext,
  root: Ref<HTMLElement | null>,
): VNode {
  const { cm, readOnly, setValue } = context
  /**
   * Updates a single matrix row's selected column value.
   *
   * @param rowId - The row the click came from.
   * @param column - The clicked column value.
   */
  const setRow = (rowId: string, column: string): void => {
    if (readOnly) return
    setValue({ ...value, [rowId]: column })
    // React restores every radio of the clicked name group to the controlled
    // value after the change event, so a click on another cell of the row
    // leaves the previously selected cell checked.
    const element = root.value
    if (!element) return
    const name = `${question.id}-${rowId}`
    let index = 0
    for (const radio of Array.from(element.querySelectorAll('input[type="radio"]'))) {
      const input = radio as HTMLInputElement
      if (input.name !== name) continue
      input.checked = value[rowId] === question.columns[index]?.value
      index++
    }
  }
  return h(
    'table',
    {
      class: cm.cn(cm.textSize('sm')),
      style: { 'border-collapse': 'collapse', width: '100%' },
      'data-mol-id': `survey-matrix-${question.id}`,
    },
    [
      h('thead', [
        h('tr', [
          h('th', { style: { 'text-align': 'left', padding: '4px' } }),
          ...question.columns.map((col) =>
            h(
              'th',
              { key: col.value, style: { 'text-align': 'center', padding: '4px' }, scope: 'col' },
              [col.label],
            ),
          ),
        ]),
      ]),
      h(
        'tbody',
        question.rows.map((row) =>
          h('tr', { key: row.id }, [
            h(
              'th',
              {
                style: { 'text-align': 'left', padding: '4px' },
                scope: 'row',
                'data-mol-id': `survey-matrix-${question.id}-row-${row.id}`,
              },
              [row.label],
            ),
            ...question.columns.map((col) =>
              h('td', { key: col.value, style: { 'text-align': 'center', padding: '4px' } }, [
                withDirectives(
                  h('input', {
                    type: 'radio',
                    name: `${question.id}-${row.id}`,
                    disabled: readOnly,
                    onChange: () => setRow(row.id, col.value),
                    'aria-label': `${row.label} - ${col.label}`,
                    'data-mol-id': `survey-matrix-${question.id}-${row.id}-${col.value}`,
                  }),
                  [[vControlledChecked, value[row.id] === col.value]],
                ),
              ]),
            ),
          ]),
        ),
      ),
    ],
  )
}

/**
 * Dispatches the right per-kind sub-component.
 *
 * @param question - The question.
 * @param value - The current answer value.
 * @param context - The control context.
 * @param root - The component root's element ref (for the matrix restore).
 * @param textarea - The long-text textarea's element ref.
 * @returns The control node, or null for an unsupported kind.
 */
function renderControl(
  question: SurveyQuestionDef,
  value: SurveyAnswerValue | undefined,
  context: ControlContext,
  root: Ref<HTMLElement | null>,
  textarea: Ref<HTMLTextAreaElement | null>,
): VNode | null {
  switch (question.kind) {
    case 'multi-choice-single':
      return multiChoiceSingle(question, (value as string) ?? '', context)
    case 'multi-choice-multi':
      return multiChoiceMulti(question, (value as string[]) ?? [], context)
    case 'true-false':
      return trueFalse(question, value as boolean | undefined, context)
    case 'short-text':
      return shortText(question, (value as string) ?? '', context)
    case 'long-text':
      return longText(question, (value as string) ?? '', context, textarea)
    case 'numeric':
      return numeric(question, (value as number | '') ?? '', context)
    case 'rating-scale':
      return ratingScale(question, value as number | undefined, context)
    case 'nps':
      return nps(question, value as number | undefined, context)
    case 'date':
      return date(question, (value as string) ?? '', context)
    case 'file-upload':
      return fileUpload(question, (value as File[]) ?? [], context)
    case 'matrix':
      return matrix(question, (value as Record<string, string>) ?? {}, context, root)
    default:
      return null
  }
}

/**
 * Multi-type survey question renderer. Discriminates on `question.kind` and
 * renders the matching sub-component for one of 11 supported kinds.
 *
 * Vue counterpart of `@molecule/app-survey-question-react`'s
 * `SurveyQuestion` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @param props - Component props (see {@link SurveyQuestionProps}).
 * @returns The question component.
 */
export const SurveyQuestion = defineComponent({
  name: 'SurveyQuestion',
  props: {
    question: {
      type: Object as PropType<SurveyQuestionDef>,
      required: true,
    },
    value: null,
    onChange: {
      type: Function as PropType<(value: SurveyAnswerValue) => void>,
      default: undefined,
    },
    onSubmit: {
      type: Function as PropType<(value: SurveyAnswerValue) => void>,
      default: undefined,
    },
    // React's `readOnly` is `boolean | undefined`: an omitted prop must stay
    // `undefined`, so the dropzone it is forwarded to renders no
    // `aria-disabled` attribute at all.
    readOnly: {
      type: Boolean,
      default: undefined,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const error = ref<string | null>(null)
    const root = ref<HTMLElement | null>(null)
    const textarea = ref<HTMLTextAreaElement | null>(null)

    /**
     * Reports a new answer value: clears the error and calls `onChange`.
     *
     * @param next - The new value.
     */
    const setValue = (next: SurveyAnswerValue): void => {
      if (props.readOnly) return
      error.value = null
      props.onChange?.(next)
    }

    /** Validates the required field and calls `onSubmit`. */
    const handleSubmit = (): void => {
      if (props.readOnly) return
      if (props.question.required && !hasAnswer(props.question.kind, props.value)) {
        error.value = t(
          'surveyQuestion.required',
          {},
          {
            defaultValue: 'This question requires an answer.',
          },
        )
        return
      }
      error.value = null
      props.onSubmit?.(props.value as SurveyAnswerValue)
    }

    // React renders a textarea's value through the DOM property only — Vue's
    // `value` key would also write the attribute — so the text is applied to
    // the node directly, on mount and on every value change.
    const syncTextarea = (): void => {
      const element = textarea.value
      if (element) element.value = typeof props.value === 'string' ? props.value : ''
    }
    watch(() => props.value, syncTextarea)
    onMounted(syncTextarea)

    return (): VNode => {
      const question = props.question
      const context: ControlContext = { cm, t, setValue, readOnly: props.readOnly }
      const prefix = `survey-question-${question.id}`
      const control = renderControl(question, props.value, context, root, textarea)
      return h(
        'div',
        {
          ref: root,
          class: cm.cn(cm.stack(3), props.className),
          'data-mol-id': prefix,
          'data-kind': question.kind,
        },
        [
          h('header', { class: cm.stack(1) }, [
            h('h3', { class: cm.cn(cm.textSize('lg'), cm.fontWeight('semibold')) }, [
              question.prompt,
              question.required
                ? h(
                    'span',
                    {
                      'aria-label': t(
                        'surveyQuestion.requiredIndicator',
                        {},
                        {
                          defaultValue: 'required',
                        },
                      ),
                      style: { color: '#ef4444', 'margin-left': '4px' },
                      'data-mol-id': `${prefix}-required`,
                    },
                    ['*'],
                  )
                : null,
            ]),
            question.description
              ? h('p', { class: cm.textSize('sm') }, [question.description])
              : null,
          ]),
          h('div', { 'data-mol-id': `${prefix}-input` }, [control]),
          question.helpText
            ? h('p', { class: cm.textSize('xs'), 'data-mol-id': `${prefix}-help` }, [
                question.helpText,
              ])
            : null,
          error.value
            ? h(
                'p',
                {
                  class: cm.textSize('xs'),
                  style: { color: '#ef4444' },
                  role: 'alert',
                  'data-mol-id': `${prefix}-error`,
                },
                [error.value],
              )
            : null,
          props.onSubmit && !props.readOnly
            ? h('div', [
                h(
                  Button,
                  {
                    type: 'button',
                    variant: 'solid',
                    color: 'primary',
                    onClick: handleSubmit,
                  },
                  () => [t('surveyQuestion.submit', {}, { defaultValue: 'Submit' })],
                ),
              ])
            : null,
        ],
      )
    }
  },
})
