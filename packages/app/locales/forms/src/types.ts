/** Translation keys for the forms locale package. */
export type FormsTranslationKey =
  | 'forms.required'
  | 'forms.min'
  | 'forms.max'
  | 'forms.minLength'
  | 'forms.maxLength'
  | 'forms.invalidFormat'
  | 'forms.invalidEmail'
  | 'forms.invalidUrl'
  | 'forms.invalidValue'
  | 'forms.submitError'

/** Translation record mapping forms keys to translated strings. */
export type FormsTranslations = Record<FormsTranslationKey, string>
