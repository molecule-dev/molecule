/** Translation keys for the vue-ui locale package. */
export type VueUiTranslationKey =
  | 'ui.alert.dismiss'
  | 'ui.avatar.alt'
  | 'ui.input.clear'
  | 'ui.modal.close'
  | 'ui.pagination.nav'
  | 'ui.pagination.first'
  | 'ui.pagination.previous'
  | 'ui.pagination.goToPage'
  | 'ui.pagination.last'
  | 'ui.spinner.loading'
  | 'ui.table.empty'
  | 'ui.toast.close'
  | 'vue.error.useToastOutsideProvider'

/** Translation record mapping vue-ui keys to translated strings. */
export type VueUiTranslations = Record<VueUiTranslationKey, string>
