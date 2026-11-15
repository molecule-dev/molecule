/**
 * Vue flashcard study card — shows the front (prompt), a "Show answer"
 * reveal button, then the back (answer) with four SM-2-compatible grade
 * buttons (Again / Hard / Good / Easy). The app owns the spaced-repetition
 * scheduling; the card only reports the grade.
 *
 * Exports `<FlashcardCard>` and the `SrsGrade` type.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { FlashcardCard } from '@molecule/app-flashcard-card-vue'
 *
 * const StudyView = defineComponent({
 *   setup() {
 *     return () =>
 *       h(FlashcardCard, {
 *         front: h('span', 'What is the capital of France?'),
 *         back: h('span', 'Paris'),
 *         progress: 'Card 3 of 20',
 *         onGrade: (grade) => scheduleNext(card.id, grade),
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * Grading flips the card back to its FRONT face (ready for the next card) —
 * swap the `front` / `back` props to advance the deck after `onGrade` fires.
 * There is no flip animation; the reveal is an instant content swap.
 *
 * Renders with the `Card` / `Button` primitives from the
 * `@molecule/app-ui-vue` peer dependency. Button labels translate via
 * `@molecule/app-locales-flashcard-card` with English fallbacks inline.
 *
 * The `front`, `back` and `progress` props are node-valued: each may be passed
 * as a prop or as the same-named Vue slot.
 *
 * @module
 */

export * from './FlashcardCard.js'
export * from './types.js'
