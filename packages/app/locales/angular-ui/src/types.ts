/** Translation keys for the angular-ui locale package. */
export type AngularUiTranslationKey =
  | 'ui.alert.dismiss'
  | 'ui.input.clear'
  | 'ui.modal.close'
  | 'ui.spinner.loading'
  | 'ui.toast.close'

/** Translation record mapping angular-ui keys to translated strings. */
export type AngularUiTranslations = Record<AngularUiTranslationKey, string>
