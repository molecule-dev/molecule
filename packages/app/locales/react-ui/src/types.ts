/** Translation keys for the react-ui locale package. */
export type ReactUiTranslationKey =
  | 'react.error.useAccordionOutsideProvider'
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
  | 'sidebar.memberStatus'
  | 'sidebarUserCard.guest'
  | 'ui.spinner.loading'
  | 'ui.table.empty'
  | 'ui.toast.close'
  | 'react.error.useToastOutsideProvider'
  | 'userMenu.guestName'
  | 'userMenuPopover.guest'
  | 'userMenu.navLabel'

/** Translation record mapping react-ui keys to translated strings. */
export type ReactUiTranslations = Record<ReactUiTranslationKey, string>
