/**
 * Vue multi-type survey-question renderer.
 *
 * Exports:
 * - `<SurveyQuestion>` — single component that dispatches on `question.kind`.
 * - `SurveyQuestion` types — discriminated union covering 11 question kinds.
 *
 * This is the Vue counterpart of `@molecule/app-survey-question-react`: the
 * same props (React names), the same rendered DOM for the same input, and the
 * same callback calls.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 * import { SurveyQuestion } from '@molecule/app-survey-question-vue'
 * import type {
 *   SurveyAnswerValue,
 *   SurveyQuestionDef,
 * } from '@molecule/app-survey-question-vue'
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
 * export const MyForm = defineComponent({
 *   setup() {
 *     const answer = ref<SurveyAnswerValue>()
 *     return () =>
 *       h(SurveyQuestion, {
 *         question,
 *         value: answer.value,
 *         onChange: (next: SurveyAnswerValue) => (answer.value = next),
 *         onSubmit: (value: SurveyAnswerValue) => console.log(value),
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()` throws otherwise) and an i18n
 *   provider (`useTranslation()`), exactly as the React package does.
 * - File uploads delegate to `<FileDropzone>` from
 *   `@molecule/app-file-dropzone-vue`, the same counterpart React uses.
 *
 * @module
 */

export * from './SurveyQuestion.js'
export * from './types.js'
