/**
 * Flashcard study component.
 *
 * Exports `<FlashcardCard>` and `SrsGrade` type.
 *
 * @example
 * ```tsx
 * import { FlashcardCard } from '@molecule/app-flashcard-card-react'
 *
 * <FlashcardCard
 *   front={<span>What is the capital of France?</span>}
 *   back={<span>Paris</span>}
 *   progress="Card 3 of 20"
 *   onGrade={(grade) => scheduleNext(card.id, grade)}
 * />
 * ```
 * @module
 */

export * from './FlashcardCard.js'
