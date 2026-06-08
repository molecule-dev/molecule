/**
 * Multi-type survey-question renderer.
 *
 * Exports:
 * - `<SurveyQuestion>` — single component that dispatches on `question.kind`.
 * - `SurveyQuestion` types — discriminated union covering 11 question kinds.
 *
 * @example
 * ```tsx
 * import { SurveyQuestion } from '@molecule/app-survey-question-react'
 * import type { SurveyQuestionDef, SurveyAnswerValue } from '@molecule/app-survey-question-react'
 * import { useState } from 'react'
 *
 * const question: SurveyQuestionDef = {
 *   id: 'q1',
 *   kind: 'multi-choice-single',
 *   prompt: 'How satisfied are you?',
 *   required: true,
 *   options: [
 *     { value: 'very', label: 'Very satisfied' },
 *     { value: 'somewhat', label: 'Somewhat satisfied' },
 *     { value: 'not', label: 'Not satisfied' },
 *   ],
 * }
 *
 * function MyForm() {
 *   const [answer, setAnswer] = useState<SurveyAnswerValue>()
 *   return <SurveyQuestion question={question} value={answer} onChange={setAnswer} onSubmit={(v) => console.log(v)} />
 * }
 * ```
 *
 * @module
 */

export * from './SurveyQuestion.js'
export * from './types.js'
