/**
 * Quiz / multiple-choice question card.
 *
 * Exports `<QuizCard>` and `QuizOption` type.
 *
 * @example
 * ```tsx
 * import { QuizCard } from '@molecule/app-quiz-card-react'
 *
 * <QuizCard
 *   question="What is the capital of France?"
 *   options={[
 *     { id: 'a', label: 'London' },
 *     { id: 'b', label: 'Paris' },
 *     { id: 'c', label: 'Berlin' },
 *   ]}
 *   correctId="b"
 *   progress="1 / 10"
 *   explanation="Paris has been the capital of France since 987 AD."
 *   onAnswer={(id, correct) => console.log(id, correct)}
 * />
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-quiz-card` (`quizCard.submit`).
 * The card is single-shot: after submit the options lock and the explanation
 * replaces the button — there is no reset prop, so advance quizzes by
 * remounting with a fresh `key` per question. Without `correctId` no
 * correct/incorrect state is revealed and `onAnswer`'s second argument is
 * `undefined`. Requires the app-react i18n provider and a wired ClassMap bond.
 *
 * @module
 */

export * from './QuizCard.js'
