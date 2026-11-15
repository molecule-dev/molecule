/**
 * Solid flashcard study card — front face → reveal back → SM-2 style grade
 * buttons (Again / Hard / Good / Easy).
 *
 * @module
 */

import type { Component } from 'solid-js'
import { createSignal } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Card } from '@molecule/app-ui-solid'

import type { FlashcardCardProps, SrsGrade } from './types.js'

/**
 * Flashcard study component — front face → reveal back → SM-2 style grade
 * buttons (Again / Hard / Good / Easy). Apps own the spaced-repetition
 * scheduling logic.
 *
 * Solid counterpart of `@molecule/app-flashcard-card-react`'s `FlashcardCard` —
 * the same props (React names), the same ClassMap tokens and the same DOM for
 * the same input. Grading flips the card back to its front face; the button
 * labels go through `useTranslation()` with React's exact keys and English
 * defaults.
 *
 * @param props - Component props (see {@link FlashcardCardProps}).
 * @returns The rendered flashcard.
 */
export const FlashcardCard: Component<FlashcardCardProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [revealed, setRevealed] = createSignal(!!props.defaultRevealed)

  /**
   * Forwards the selected grade to the parent and resets the card to hidden.
   *
   * @param grade - The selected SM-2 grade.
   */
  const grade = (grade: SrsGrade): void => {
    props.onGrade?.(grade)
    setRevealed(false)
  }

  return (
    <Card className={props.className}>
      <div class={cm.stack(4)}>
        {props.progress && (
          <div class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.textCenter)}>
            {props.progress}
          </div>
        )}
        <div class={cm.cn(cm.sp('p', 6), cm.textCenter, cm.cn(cm.textSize('xl')))}>
          {revealed() ? props.back : props.front}
        </div>
        {!revealed() ? (
          <Button variant="solid" color="primary" onClick={() => setRevealed(true)}>
            {t('flashcard.reveal', {}, { defaultValue: 'Show answer' })}
          </Button>
        ) : (
          <div class={cm.grid({ cols: 4, gap: 'sm' })}>
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
