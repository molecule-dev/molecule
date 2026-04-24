import type { ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-react'

/**
 *
 */
export type SrsGrade = 'again' | 'hard' | 'good' | 'easy'

interface FlashcardCardProps {
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
 * @param root0
 * @param root0.front
 * @param root0.back
 * @param root0.onGrade
 * @param root0.progress
 * @param root0.defaultRevealed
 * @param root0.className
 */
export function FlashcardCard({
  front,
  back,
  onGrade,
  progress,
  defaultRevealed,
  className,
}: FlashcardCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(!!defaultRevealed)

  /**
   *
   * @param g
   */
  function grade(g: SrsGrade) {
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
