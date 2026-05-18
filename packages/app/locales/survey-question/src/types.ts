/** Translation keys for the survey-question locale package. */
export type SurveyQuestionTranslationKey =
  | 'surveyQuestion.required'
  | 'surveyQuestion.requiredIndicator'
  | 'surveyQuestion.submit'
  | 'surveyQuestion.trueFalse.true'
  | 'surveyQuestion.trueFalse.false'
  | 'surveyQuestion.nps.low'
  | 'surveyQuestion.nps.high'
  | 'surveyQuestion.file.noFiles'

/** Translation record mapping survey-question keys to translated strings. */
export type SurveyQuestionTranslations = Record<SurveyQuestionTranslationKey, string>
