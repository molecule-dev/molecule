/**
 * Solid multi-type survey-question renderer.
 *
 * Exports:
 * - `<SurveyQuestion>` — single component that dispatches on `question.kind`.
 * - `SurveyQuestion` types — discriminated union covering 11 question kinds.
 *
 * This is the Solid counterpart of `@molecule/app-survey-question-react`: the
 * same props (React names), the same rendered DOM for the same input, and the
 * same callback calls.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { SurveyQuestion } from '@molecule/app-survey-question-solid'
 * import type {
 *   SurveyAnswerValue,
 *   SurveyQuestionDef,
 * } from '@molecule/app-survey-question-solid'
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
 * export function MyForm() {
 *   const [answer, setAnswer] = createSignal<SurveyAnswerValue>()
 *   return (
 *     <SurveyQuestion
 *       question={question}
 *       value={answer()}
 *       onChange={setAnswer}
 *       onSubmit={(value) => console.log(value)}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()` throws otherwise) and an i18n
 *   provider (`useTranslation()`), exactly as the React package does.
 * - File uploads delegate to `<FileDropzone>` from
 *   `@molecule/app-file-dropzone-solid`, the same counterpart React uses.
 *
 * @module
 */

export * from './SurveyQuestion.jsx'
export * from './types.js'
