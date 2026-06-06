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
 * @module
 */

export * from './QuizCard.js'
