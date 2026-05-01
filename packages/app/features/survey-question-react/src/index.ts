/**
 * Multi-type survey-question renderer.
 *
 * Exports:
 * - `<SurveyQuestion>` — single component that dispatches on `question.kind`.
 * - `SurveyQuestion` types — discriminated union covering 11 question kinds.
 *
 * @module
 */

export * from './types.js'
export * from './SurveyQuestion.js'
