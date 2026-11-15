/**
 * Svelte flashcard study card — the Svelte counterpart of
 * `@molecule/app-flashcard-card-react`, with the same props and the same DOM.
 *
 * Exports `FlashcardCard` — it shows the front (prompt), a "Show answer"
 * reveal button, then the back (answer) with four SM-2-compatible grade
 * buttons (Again / Hard / Good / Easy). The app owns the spaced-repetition
 * scheduling; the card only reports the grade.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { FlashcardCard } from '@molecule/app-flashcard-card-svelte'
 *
 *   let { card, scheduleNext } = $props()
 * </script>
 *
 * <FlashcardCard
 *   front={card.prompt}
 *   back={card.answer}
 *   progress="Card 3 of 20"
 *   onGrade={(grade) => scheduleNext(card.id, grade)}
 * />
 * ```
 *
 * @remarks
 * Grading flips the card back to its FRONT face (ready for the next card) —
 * swap the `front` / `back` props to advance the deck after `onGrade` fires.
 * There is no flip animation; the reveal is an instant content swap.
 *
 * Renders with the `Card` / `Button` primitives from the
 * `@molecule/app-ui-svelte` peer dependency. Button labels translate via
 * `@molecule/app-locales-flashcard-card` with English fallbacks inline.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
