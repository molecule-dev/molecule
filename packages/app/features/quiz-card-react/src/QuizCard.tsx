import type { ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-react'

/**
 *
 */
export interface QuizOption {
  id: string
  label: ReactNode
}

interface QuizCardProps {
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
 * @param root0
 * @param root0.question
 * @param root0.options
 * @param root0.correctId
 * @param root0.onAnswer
 * @param root0.progress
 * @param root0.timer
 * @param root0.explanation
 * @param root0.className
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
}: QuizCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  /**
   *
   */
  function submit() {
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
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  isSelected ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                )}
                style={{
                  borderRadius: 8,
                  border: `1px solid ${isCorrect ? '#22c55e' : isWrong ? '#ef4444' : isSelected ? 'currentColor' : 'rgba(0,0,0,0.15)'}`,
                  background: isCorrect
                    ? 'rgba(34,197,94,0.1)'
                    : isWrong
                      ? 'rgba(239,68,68,0.1)'
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
