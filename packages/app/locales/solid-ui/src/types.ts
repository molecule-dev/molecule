/** Translation keys for the solid-ui locale package. */
export type SolidUiTranslationKey =
  | 'solid.error.useAccordionOutsideProvider'
  | 'ui.alert.dismiss'
  | 'ui.avatar.alt'
  | 'ui.input.clear'
  | 'ui.modal.close'
  | 'ui.pagination.nav'
  | 'ui.pagination.first'
  | 'ui.pagination.previous'
  | 'ui.pagination.goToPage'
  | 'ui.pagination.last'
  | 'ui.progress.label'
  | 'ui.radioGroup.label'
  | 'ui.spinner.loading'
  | 'ui.table.empty'
  | 'ui.toast.close'
  | 'solid.error.useToastOutsideProvider'

/** Translation record mapping solid-ui keys to translated strings. */
export type SolidUiTranslations = Record<SolidUiTranslationKey, string>
