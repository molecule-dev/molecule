/**
 * Angular multi-type survey-question renderer.
 *
 * Exports `SurveyQuestion` — one standalone component (`div[mol-survey-question]`)
 * that dispatches on `question.kind` — and the `SurveyQuestion` types, a
 * discriminated union covering 11 question kinds.
 *
 * This is the Angular counterpart of `@molecule/app-survey-question-react`: the
 * same props (React names), the same rendered DOM for the same input, and the
 * same callback calls.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { SurveyQuestion } from '@molecule/app-survey-question-angular'
 * import type {
 *   SurveyAnswerValue,
 *   SurveyQuestionDef,
 * } from '@molecule/app-survey-question-angular'
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
 * @Component({
 *   selector: 'app-my-form',
 *   standalone: true,
 *   imports: [SurveyQuestion],
 *   template: `
 *     <div
 *       mol-survey-question
 *       [question]="question"
 *       [value]="answer"
 *       [onChange]="updateAnswer"
 *       [onSubmit]="submit"
 *     ></div>
 *   `,
 * })
 * export class MyForm {
 *   question = question
 *   answer?: SurveyAnswerValue
 *   readonly updateAnswer = (value: SurveyAnswerValue): void => {
 *     this.answer = value
 *   }
 *   readonly submit = (value: SurveyAnswerValue | undefined): void => {
 *     console.log(value)
 *   }
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()` throws otherwise) and an i18n
 *   provider (`useTranslation()`), exactly as the React package does.
 * - The host element IS React's root `<div>`, so it carries the same classes,
 *   `data-mol-id` and `data-kind`.
 * - File uploads delegate to the `div[mol-file-dropzone]` counterpart of the
 *   React package's `<FileDropzone>`.
 * - File-upload answers are `readonly PickedFile[]`. An unanswered optional
 *   question passes `undefined` to `onSubmit`.
 *
 * @module
 */

export * from './survey-question.component.js'
export * from './types.js'
