/**
 * Multi-type survey-question renderer.
 *
 * Exports:
 * - `<SurveyQuestion>` — single component that dispatches on `question.kind`.
 * - `SurveyQuestion` types — discriminated union covering 11 question kinds.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { post } from '@molecule/app-http'
 * import {
 *   type SurveyAnswerValue,
 *   SurveyQuestion,
 *   type SurveyQuestionDef,
 * } from '@molecule/app-survey-question-react'
 *
 * const question: SurveyQuestionDef = {
 *   id: 'nps',
 *   kind: 'nps',
 *   prompt: 'How likely are you to recommend us to a friend?',
 *   required: true,
 * }
 *
 * export function NpsSurvey() {
 *   const [answer, setAnswer] = useState<SurveyAnswerValue>()
 *   const [status, setStatus] = useState<'idle' | 'sent' | 'failed'>('idle')
 *   function submit(value: SurveyAnswerValue): void {
 *     post('/survey-responses', { questionId: question.id, value }).then(
 *       () => setStatus('sent'),
 *       () => setStatus('failed'),
 *     )
 *   }
 *   if (status === 'sent') return <p>Thanks for your feedback!</p>
 *   return (
 *     <>
 *       <SurveyQuestion question={question} value={answer} onChange={setAnswer} onSubmit={submit} />
 *       {status === 'failed' && <p role="alert">Could not send your answer. Please try again.</p>}
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - It is CONTROLLED and renders ONE question: pass `value` + `onChange`
 *   and keep the answer in your state (without `onChange` clicks do
 *   nothing). Build multi-question surveys by rendering several and
 *   collecting the answers yourself.
 * - The question type is `SurveyQuestionDef` (the name `SurveyQuestion` is
 *   the component). `kind` values are kebab-case (`'multi-choice-single'`,
 *   `'rating-scale'`, `'nps'`, …) and the answer shape depends on it
 *   (`nps`/`rating-scale` → number, `multi-choice-multi` → `string[]`,
 *   `matrix` → `Record<rowId, value>`, `file-upload` → `File[]`).
 * - It does NOT persist or upload anything. The Submit button only renders
 *   when `onSubmit` is passed; `onSubmit` fires only after the `required`
 *   check passes (otherwise an inline "This question requires an answer."
 *   alert shows) and is NOT awaited — handle your API errors yourself.
 *   `file-upload` hands you `File` objects; upload them yourself.
 * - Must render inside `<I18nProvider>` / `<MoleculeProvider>`
 *   (`useTranslation()` throws otherwise) with a ClassMap bond wired
 *   (`setClassMap(classMap)` from `@molecule/app-ui`). Peer deps:
 *   `@molecule/app-ui-react` and `@molecule/app-file-dropzone-react`.
 *   UI strings use `surveyQuestion.*` keys (companion bond:
 *   `@molecule/app-locales-survey-question`); `prompt`/option labels are
 *   yours — pass translated text.
 *
 * @module
 */

export * from './SurveyQuestion.js'
export * from './types.js'
