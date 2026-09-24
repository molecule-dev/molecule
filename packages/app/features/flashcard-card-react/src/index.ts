/**
 * Flashcard study card — shows the front (prompt), a "Show answer"
 * reveal button, then the back (answer) with four SM-2-compatible
 * grade buttons (Again / Hard / Good / Easy). The app owns the
 * spaced-repetition scheduling; the card only reports the grade.
 *
 * Exports `<FlashcardCard>` and the `SrsGrade` type.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { FlashcardCard, type SrsGrade } from '@molecule/app-flashcard-card-react'
 *
 * const deck = [
 *   { id: 'fr-1', front: 'What is the capital of France?', back: 'Paris' },
 *   { id: 'fr-2', front: 'What is the capital of Japan?', back: 'Tokyo' },
 * ]
 *
 * export function StudyView() {
 *   const [index, setIndex] = useState(0)
 *   const [grades, setGrades] = useState<Record<string, SrsGrade>>({})
 *   const card = deck[index]
 *   if (!card) return <p>Deck complete: {Object.values(grades).join(', ')}</p>
 *   return (
 *     <FlashcardCard
 *       front={card.front}
 *       back={card.back}
 *       progress={`Card ${index + 1} of ${deck.length}`}
 *       onGrade={(grade) => {
 *         setGrades((prev) => ({ ...prev, [card.id]: grade })) // feed your SM-2 scheduler here
 *         setIndex(index + 1)
 *       }}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * It does NOT schedule reviews, persist grades or advance the deck: `onGrade`
 * only reports `'again' | 'hard' | 'good' | 'easy'` (strings, not SM-2's
 * 0–5 numbers — map them yourself). Keep the deck position in your own state.
 *
 * It calls `useTranslation()`, so it must render inside `<I18nProvider>` /
 * `<MoleculeProvider>`; `getClassMap()` throws unless
 * `setClassMap(classMap)` from `@molecule/app-ui` ran at startup.
 *
 * Grading flips the card back to its FRONT face (ready for the next
 * card) — swap the `front` / `back` props to advance the deck after
 * `onGrade` fires. There is no flip animation; the reveal is an
 * instant content swap.
 *
 * Renders with the `Card` / `Button` primitives from the
 * `@molecule/app-ui-react` peer dependency. Button labels translate
 * via `@molecule/app-locales-flashcard-card` with English fallbacks
 * inline.
 *
 * @module
 */

export * from './FlashcardCard.js'
