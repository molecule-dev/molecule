/** Translation keys for the admin-table locale package. */
export type AdminTableTranslationKey =
  | 'adminTable.aria.rowActions'
  | 'adminTable.aria.selectRow'
  | 'adminTable.aria.selectColumn'
  | 'adminTable.aria.actionsColumn'

/** Translation record mapping `@molecule/app-admin-table-react` keys to translated strings. */
export type AdminTableTranslations = Record<AdminTableTranslationKey, string>
