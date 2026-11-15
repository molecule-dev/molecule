/**
 * Angular flashcard study card — the counterpart of
 * `@molecule/app-flashcard-card-react`: the same props and the same DOM for
 * the same input.
 *
 * Exports `<FlashcardCard>` — it shows the front (prompt), a "Show answer"
 * reveal button, then the back (answer) with four SM-2-compatible grade
 * buttons (Again / Hard / Good / Easy). The app owns the spaced-repetition
 * scheduling; the card only reports the grade.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { FlashcardCard } from '@molecule/app-flashcard-card-angular'
 *
 * @Component({
 *   selector: 'app-study',
 *   standalone: true,
 *   imports: [FlashcardCard],
 *   template: `
 *     <div mol-flashcard-card [progress]="'Card 3 of 20'" [onGrade]="onGrade">
 *       <span slot="front">What is the capital of France?</span>
 *       <span slot="back">Paris</span>
 *     </div>
 *   `,
 * })
 * export class StudyView {
 *   onGrade(grade: string): void {
 *     console.log(grade)
 *   }
 * }
 * ```
 *
 * @remarks
 * Grading flips the card back to its FRONT face (ready for the next card) —
 * swap the projected content to advance the deck after `onGrade` fires. There
 * is no flip animation; the reveal is an instant content swap.
 *
 * The host element is the card surface itself (`div[mol-flashcard-card]`),
 * carrying the `Card` classes React renders. The buttons come from
 * `@molecule/app-ui-angular`'s `Button` (`button[mol-button]`); their labels
 * translate via `@molecule/app-locales-flashcard-card` with English fallbacks
 * inline.
 *
 * @module
 */

export * from './flashcard-card.component.js'
export * from './types.js'
