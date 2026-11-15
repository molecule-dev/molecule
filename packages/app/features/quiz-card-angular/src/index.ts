/**
 * Angular quiz / multiple-choice question card — the counterpart of
 * `@molecule/app-quiz-card-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<QuizCard>` and the `QuizOption` type.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { QuizCard } from '@molecule/app-quiz-card-angular'
 *
 * @Component({
 *   selector: 'app-question',
 *   standalone: true,
 *   imports: [QuizCard],
 *   template: `
 *     <div mol-quiz-card [progress]="'1 / 10'" [correctId]="'b'" [onAnswer]="onAnswer">
 *       <span slot="question">What is the capital of France?</span>
 *       <span slot="explanation">Paris has been the capital of France since 987 AD.</span>
 *     </div>
 *   `,
 * })
 * export class Question {
 *   options = [
 *     { id: 'a', label: 'London' },
 *     { id: 'b', label: 'Paris' },
 *     { id: 'c', label: 'Berlin' },
 *   ]
 *
 *   onAnswer(id: string, correct?: boolean): void {
 *     console.log(id, correct)
 *   }
 * }
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-quiz-card` (`quizCard.submit`).
 * The card is single-shot: after submit the options lock and the explanation
 * replaces the button — there is no reset prop, so advance quizzes by
 * remounting with a fresh `key` per question. Without `correctId` no
 * correct/incorrect state is revealed and `onAnswer`'s second argument is
 * `undefined`. Requires the app-angular i18n provider and a wired ClassMap
 * bond.
 *
 * The host element is the card surface itself (`div[mol-quiz-card]`), carrying
 * the `Card` classes React renders. The node-valued `question`, `progress`,
 * `timer` and `explanation` props are projected content
 * (`[slot=question]`, `[slot=progress]`, `[slot=timer]`,
 * `[slot=explanation]`) or plain strings.
 *
 * @module
 */

export * from './quiz-card.component.js'
export * from './types.js'
