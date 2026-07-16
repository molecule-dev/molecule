import type { ReactElement, ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-react'

/** SM-2-compatible grade values the caller uses to schedule the next review. */
export type SrsGrade = 'again' | 'hard' | 'good' | 'easy'

export interface FlashcardCardProps {
  /** Front content (prompt). */
  front: ReactNode
  /** Back content (answer). */
  back: ReactNode
  /** Called when the user grades the card after revealing the answer. */
  onGrade?: (grade: SrsGrade) => void
  /** Optional progress / position. */
  progress?: ReactNode
  /** Initially show the answer. */
  defaultRevealed?: boolean
  /** Extra classes. */
  className?: string
}

/**
 * Flashcard study component — front face → reveal back → SM-2 style
 * grade buttons (Again / Hard / Good / Easy). Apps own the
 * spaced-repetition scheduling logic.
 * @param props - Component props (see {@link FlashcardCardProps}).
 */
export function FlashcardCard({
  front,
  back,
  onGrade,
  progress,
  defaultRevealed,
  className,
}: FlashcardCardProps): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(!!defaultRevealed)

  /**
   * Forwards the selected grade to the parent and resets the card to hidden.
   * @param g
   */
  function grade(g: SrsGrade): void {
    onGrade?.(g)
    setRevealed(false)
  }

  return (
    <Card className={className}>
      <div className={cm.stack(4)}>
        {progress && (
          <div className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.textCenter)}>
            {progress}
          </div>
        )}
        <div className={cm.cn(cm.sp('p', 6), cm.textCenter, cm.cn(cm.textSize('xl')))}>
          {revealed ? back : front}
        </div>
        {!revealed ? (
          <Button variant="solid" color="primary" onClick={() => setRevealed(true)}>
            {t('flashcard.reveal', {}, { defaultValue: 'Show answer' })}
          </Button>
        ) : (
          <div className={cm.grid({ cols: 4, gap: 'sm' })}>
            <Button variant="outline" color="error" onClick={() => grade('again')}>
              {t('flashcard.again', {}, { defaultValue: 'Again' })}
            </Button>
            <Button variant="outline" color="warning" onClick={() => grade('hard')}>
              {t('flashcard.hard', {}, { defaultValue: 'Hard' })}
            </Button>
            <Button variant="outline" color="primary" onClick={() => grade('good')}>
              {t('flashcard.good', {}, { defaultValue: 'Good' })}
            </Button>
            <Button variant="outline" color="success" onClick={() => grade('easy')}>
              {t('flashcard.easy', {}, { defaultValue: 'Easy' })}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
