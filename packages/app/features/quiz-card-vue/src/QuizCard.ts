/**
 * Vue quiz question card — multiple-choice options, progress, optional timer,
 * correct/incorrect feedback.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-vue'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import type { QuizOption } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * prop when the caller passed one, otherwise the slot, otherwise nothing.
 *
 * @param value - The prop's value, when the caller passed the prop.
 * @param slot - The same-named slot's render function, when provided.
 * @returns The children to render.
 */
const nodeOrSlot = (
  value: VNodeChild | null | undefined,
  slot: (() => VNodeChild[]) | undefined,
): VNodeChild[] => {
  if (value !== undefined && value !== null && value !== false && value !== '') return [value]
  return slot ? slot() : []
}

/**
 * The answer button's inline style — React's verdict colours and touch
 * radius, exactly (no background declared unless a verdict shows).
 *
 * @param isCorrect - Whether the verdict is a correct answer.
 * @param isWrong - Whether the verdict is a wrong answer.
 * @param isSelected - Whether the option is the current selection.
 * @returns The style bound to the button.
 */
const optionStyle = (
  isCorrect: boolean,
  isWrong: boolean,
  isSelected: boolean,
): Record<string, string> => {
  const success = 'var(--mol-color-success, #22c55e)'
  const error = 'var(--mol-color-error, #ef4444)'
  const style: Record<string, string> = {
    borderRadius: '8px',
    border: `1px solid ${
      isCorrect
        ? success
        : isWrong
          ? error
          : isSelected
            ? 'currentColor'
            : 'var(--mol-color-border, rgba(128,128,128,0.35))'
    }`,
  }
  if (isCorrect) style.background = `color-mix(in srgb, ${success} 12%, transparent)`
  else if (isWrong) style.background = `color-mix(in srgb, ${error} 12%, transparent)`
  return style
}

/**
 * Single quiz question card with multiple-choice options. Tracks its own
 * submit state and reveals correct/incorrect when `correctId` is provided.
 *
 * Vue counterpart of `@molecule/app-quiz-card-react`'s `QuizCard` — the same
 * props (React names), the same ClassMap tokens, the same DOM for the same
 * input, and the same `onAnswer(id, correct)` calls. The card is single-shot:
 * after submit the options lock and the explanation replaces the button.
 *
 * @param props - Component props (see {@link QuizCardProps} in `./types.js`).
 * @returns The quiz card component.
 */
export const QuizCard = defineComponent({
  name: 'QuizCard',
  props: {
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null`).
    question: { type: null, required: true },
    options: { type: Array as PropType<QuizOption[]>, required: true },
    correctId: String,
    onAnswer: Function as PropType<(optionId: string, correct?: boolean) => void>,
    progress: null,
    timer: null,
    explanation: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const selected = ref<string | null>(null)
    const submitted = ref(false)

    /**
     * Validates the selection and fires onAnswer with the correctness flag.
     */
    const submit = (): void => {
      const optionId = selected.value
      if (!optionId || submitted.value) return
      submitted.value = true
      props.onAnswer?.(optionId, props.correctId ? optionId === props.correctId : undefined)
    }

    return (): VNode => {
      const collapsed = submitted.value
      const explanation = nodeOrSlot(props.explanation, slots.explanation)
      return h(Card, { className: props.className }, () => [
        h('div', { class: cm.stack(4) }, [
          h(
            'header',
            { class: cm.flex({ justify: 'between', align: 'center', gap: 'sm' }) },
            () => {
              const progress = nodeOrSlot(props.progress, slots.progress)
              return [
                toChildArray(progress).length > 0
                  ? h(
                      'span',
                      { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) },
                      progress,
                    )
                  : null,
                ...nodeOrSlot(props.timer, slots.timer),
              ]
            },
          ),
          h('h2', { class: cm.cn(cm.textSize('lg'), cm.fontWeight('bold')) }, () =>
            nodeOrSlot(props.question, slots.question),
          ),
          h('div', { class: cm.stack(2) }, () =>
            props.options.map((option) => {
              const isSelected = option.id === selected.value
              const isCorrect = collapsed && !!props.correctId && option.id === props.correctId
              const isWrong =
                collapsed && !!props.correctId && isSelected && option.id !== props.correctId
              return h(
                'button',
                {
                  key: option.id,
                  type: 'button',
                  onClick: () => {
                    if (!collapsed) selected.value = option.id
                  },
                  disabled: collapsed,
                  'aria-pressed': isSelected,
                  'data-mol-id': 'quiz-card-option',
                  'data-correct': isCorrect ? 'true' : undefined,
                  'data-wrong': isWrong ? 'true' : undefined,
                  class: cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.cursorPointer,
                    cm.touchTargetCompact,
                    isSelected ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                  ),
                  style: optionStyle(isCorrect, isWrong, isSelected),
                },
                () => [
                  h('span', [option.label as VNodeChild]),
                  isCorrect ? h('span', { 'aria-hidden': true }, '✓') : null,
                  isWrong ? h('span', { 'aria-hidden': true }, '×') : null,
                ],
              )
            }),
          ),
          !collapsed
            ? h(
                Button,
                {
                  variant: 'solid',
                  color: 'primary',
                  onClick: submit,
                  disabled: !selected.value,
                },
                () => t('quizCard.submit', {}, { defaultValue: 'Submit answer' }),
              )
            : explanation.length > 0
              ? h('p', { class: cm.textSize('sm') }, () => explanation)
              : null,
        ]),
      ])
    }
  },
})
