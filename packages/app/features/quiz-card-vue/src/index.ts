/**
 * Vue quiz / multiple-choice question card.
 *
 * Exports `<QuizCard>` and the `QuizOption` type. The Vue counterpart of
 * `@molecule/app-quiz-card-react`: the same props (React names), the same DOM
 * for the same input and the same `onAnswer(id, correct)` calls.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { QuizCard } from '@molecule/app-quiz-card-vue'
 *
 * const Question = defineComponent({
 *   setup() {
 *     return () =>
 *       h(QuizCard, {
 *         question: 'What is the capital of France?',
 *         options: [
 *           { id: 'a', label: 'London' },
 *           { id: 'b', label: 'Paris' },
 *           { id: 'c', label: 'Berlin' },
 *         ],
 *         correctId: 'b',
 *         progress: '1 / 10',
 *         explanation: 'Paris has been the capital of France since 987 AD.',
 *         onAnswer: (id, correct) => console.log(id, correct),
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-quiz-card` (`quizCard.submit`).
 * The card is single-shot: after submit the options lock and the explanation
 * replaces the button — there is no reset prop, so advance quizzes by
 * remounting with a fresh `key` per question. Without `correctId` no
 * correct/incorrect state is revealed and `onAnswer`'s second argument is
 * `undefined`. Requires the app-vue i18n provider and a wired ClassMap bond.
 *
 * The `question`, `progress`, `timer` and `explanation` props are
 * node-valued: each may be passed as a prop or as the same-named Vue slot.
 *
 * @module
 */

export * from './QuizCard.js'
export * from './types.js'
