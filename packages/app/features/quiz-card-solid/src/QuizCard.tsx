/**
 * Solid quiz question card — multiple-choice options, progress, optional
 * timer, correct/incorrect feedback.
 *
 * @module
 */

import { type Component, createSignal, For } from 'solid-js'

import { PresentWhileNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-solid'

import type { QuizCardProps, QuizOption } from './types.js'

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
    'border-radius': '8px',
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
 * Solid counterpart of `@molecule/app-quiz-card-react`'s `QuizCard` — the same
 * props (React names), the same ClassMap tokens, the same DOM for the same
 * input, and the same `onAnswer(id, correct)` calls. React keys each option
 * button by the option's `id`, so a re-passed or re-ordered array moves/keeps
 * the rendered buttons per key. Solid's `For` keys by reference, so the
 * buttons are keyed through stable per-id records: the record for an id is
 * created once and reused, while the button reads the CURRENT option for its
 * id reactively.
 *
 * @param props - Component props (see {@link QuizCardProps}).
 * @returns The rendered quiz card.
 */
export const QuizCard: Component<QuizCardProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [selected, setSelected] = createSignal<string | null>(null)
  const [submitted, setSubmitted] = createSignal(false)

  /** One stable record per option id, created on first sight. */
  interface OptionRow {
    id: string
  }
  const records = new Map<string, OptionRow>()

  /**
   * One stable keyed record per rendered option id, in render order.
   * @returns The records to render.
   */
  const keyedOptions = (): OptionRow[] => {
    const seen = new Set<string>()
    const rows = props.options.map((option) => {
      seen.add(option.id)
      let row = records.get(option.id)
      if (!row) {
        row = { id: option.id }
        records.set(option.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }

  /**
   * The current option for an id.
   * @param id - The option id.
   * @returns The option, or undefined when it vanished.
   */
  const optionFor = (id: string): QuizOption | undefined =>
    props.options.find((option) => option.id === id)

  /** Validates the selection and fires onAnswer with the correctness flag. */
  const submit = (): void => {
    const optionId = selected()
    if (!optionId || submitted()) return
    setSubmitted(true)
    props.onAnswer?.(optionId, props.correctId ? optionId === props.correctId : undefined)
  }

  return (
    <Card className={props.className}>
      <div class={cm.stack(4)}>
        <header class={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
          <PresentWhileNode node={props.progress}>
            {(progress) => (
              <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{progress()}</span>
            )}
          </PresentWhileNode>
          {props.timer}
        </header>
        <h2 class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{props.question}</h2>
        <div class={cm.stack(2)}>
          <For each={keyedOptions()}>
            {(row) => {
              const option = (): QuizOption => optionFor(row.id) ?? { id: row.id, label: '' }
              const isSelected = (): boolean => option().id === selected()
              const isCorrect = (): boolean =>
                submitted() && !!props.correctId && option().id === props.correctId
              const isWrong = (): boolean =>
                submitted() && !!props.correctId && isSelected() && option().id !== props.correctId
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (!submitted()) setSelected(option().id)
                  }}
                  disabled={submitted()}
                  aria-pressed={isSelected()}
                  data-mol-id="quiz-card-option"
                  data-correct={isCorrect() ? 'true' : undefined}
                  data-wrong={isWrong() ? 'true' : undefined}
                  class={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.cursorPointer,
                    cm.touchTargetCompact,
                    isSelected() ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                  )}
                  style={optionStyle(isCorrect(), isWrong(), isSelected())}
                >
                  <span>{option().label}</span>
                  {isCorrect() && <span aria-hidden="true">✓</span>}
                  {isWrong() && <span aria-hidden="true">×</span>}
                </button>
              )
            }}
          </For>
        </div>
        {!submitted() ? (
          <Button variant="solid" color="primary" onClick={submit} disabled={!selected()}>
            {t('quizCard.submit', {}, { defaultValue: 'Submit answer' })}
          </Button>
        ) : (
          props.explanation && <p class={cm.textSize('sm')}>{props.explanation}</p>
        )}
      </div>
    </Card>
  )
}
