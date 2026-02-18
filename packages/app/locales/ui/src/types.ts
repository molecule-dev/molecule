/** Translation keys for the ui locale package. */
export type UiTranslationKey =
  | 'ui.modal.close'
  | 'ui.toast.close'
  | 'ui.alert.dismiss'
  | 'ui.input.clear'
  | 'ui.pagination.nav'
  | 'ui.pagination.first'
  | 'ui.pagination.previous'
  | 'ui.pagination.next'
  | 'ui.pagination.last'
  | 'ui.pagination.goToPage'
  | 'ui.table.empty'
  | 'ui.avatar.alt'
  | 'ui.spinner.loading'
  | 'ui.radioGroup.label'
  | 'ui.progress.label'

/** Translation record mapping ui keys to translated strings. */
export type UiTranslations = Record<UiTranslationKey, string>
