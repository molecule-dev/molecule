import type { JSX, ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-react'

/** A single selectable answer option in a quiz question. */
export interface QuizOption {
  id: string
  label: ReactNode
}

/** Props for {@link QuizCard}. */
export interface QuizCardProps {
  /** The question text. */
  question: ReactNode
  /** Answer options. */
  options: QuizOption[]
  /** Id of the correct option — when provided, the component reveals correct/incorrect on submit. */
  correctId?: string
  /** Called when the user submits an answer. */
  onAnswer?: (optionId: string, correct?: boolean) => void
  /** Progress display — e.g. `2 / 10`. */
  progress?: ReactNode
  /** Optional countdown / timer node above the question. */
  timer?: ReactNode
  /** Explanation shown after submit. */
  explanation?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Single quiz question card with multiple-choice options. Tracks its
 * own submit state and reveals correct/incorrect when `correctId` is
 * provided.
 * @param props - Component props (see {@link QuizCardProps}).
 */
export function QuizCard({
  question,
  options,
  correctId,
  onAnswer,
  progress,
  timer,
  explanation,
  className,
}: QuizCardProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  /** Validate selection and fire onAnswer with correctness flag. */
  function submit(): void {
    if (!selected || submitted) return
    setSubmitted(true)
    onAnswer?.(selected, correctId ? selected === correctId : undefined)
  }

  return (
    <Card className={className}>
      <div className={cm.stack(4)}>
        <header className={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
          {progress && (
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{progress}</span>
          )}
          {timer}
        </header>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{question}</h2>
        <div className={cm.stack(2)}>
          {options.map((o) => {
            const isSelected = o.id === selected
            const isCorrect = submitted && correctId && o.id === correctId
            const isWrong = submitted && correctId && isSelected && o.id !== correctId
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => !submitted && setSelected(o.id)}
                disabled={submitted}
                aria-pressed={isSelected}
                data-mol-id="quiz-card-option"
                data-correct={isCorrect ? 'true' : undefined}
                data-wrong={isWrong ? 'true' : undefined}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.cursorPointer,
                  cm.touchTargetCompact,
                  isSelected ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                )}
                /* mol-bespoke-button: full-width answer ROW, not a CTA — it
                   wraps to multiple lines and stays left-aligned, which the
                   fixed-height `cm.button()` tiers cannot do, and its border
                   carries a right/wrong verdict no button variant expresses.
                   Every colour is a theme token now (`#22c55e` / `#ef4444` /
                   `rgba(0,0,0,0.15)` ignored the theme and lost the verdict
                   contrast in dark mode); compact touch floor applied. */
                style={{
                  borderRadius: 8,
                  border: `1px solid ${
                    isCorrect
                      ? 'var(--mol-color-success, #22c55e)'
                      : isWrong
                        ? 'var(--mol-color-error, #ef4444)'
                        : isSelected
                          ? 'currentColor'
                          : 'var(--mol-color-border, rgba(128,128,128,0.35))'
                  }`,
                  background: isCorrect
                    ? 'color-mix(in srgb, var(--mol-color-success, #22c55e) 12%, transparent)'
                    : isWrong
                      ? 'color-mix(in srgb, var(--mol-color-error, #ef4444) 12%, transparent)'
                      : undefined,
                }}
              >
                <span>{o.label}</span>
                {isCorrect && <span aria-hidden>✓</span>}
                {isWrong && <span aria-hidden>×</span>}
              </button>
            )
          })}
        </div>
        {!submitted ? (
          <Button variant="solid" color="primary" onClick={submit} disabled={!selected}>
            {t('quizCard.submit', {}, { defaultValue: 'Submit answer' })}
          </Button>
        ) : (
          explanation && <p className={cm.textSize('sm')}>{explanation}</p>
        )}
      </div>
    </Card>
  )
}
