/**
 * Svelte multi-type survey-question renderer.
 *
 * Exports `SurveyQuestion` — single component that dispatches on
 * `question.kind` — and the `SurveyQuestion` types, a discriminated union
 * covering 11 question kinds.
 *
 * This is the Svelte counterpart of `@molecule/app-survey-question-react`: the
 * same props (React names), the same rendered DOM for the same input, and the
 * same callback calls.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { SurveyQuestion } from '@molecule/app-survey-question-svelte'
 *   import type {
 *     SurveyAnswerValue,
 *     SurveyQuestionDef,
 *   } from '@molecule/app-survey-question-svelte'
 *
 *   const question: SurveyQuestionDef = {
 *     id: 'q1',
 *     kind: 'multi-choice-single',
 *     prompt: 'How satisfied are you?',
 *     required: true,
 *     options: [
 *       { value: 'very', label: 'Very satisfied' },
 *       { value: 'somewhat', label: 'Somewhat satisfied' },
 *       { value: 'not', label: 'Not satisfied' },
 *     ],
 *   }
 *
 *   let answer = $state<SurveyAnswerValue>()
 * </script>
 *
 * <SurveyQuestion
 *   {question}
 *   value={answer}
 *   onChange={(next: SurveyAnswerValue) => (answer = next)}
 *   onSubmit={(value: SurveyAnswerValue) => console.log(value)}
 * />
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()` throws otherwise) and an i18n
 *   provider (`useTranslation()`), exactly as the React package does.
 * - File uploads delegate to `FileDropzone` from
 *   `@molecule/app-file-dropzone-svelte`, the same counterpart React uses.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
