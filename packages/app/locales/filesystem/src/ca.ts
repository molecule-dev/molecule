import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for ca. */
export const ca: Partial<FilesystemTranslations> = {
  'filesystem.error.noProvider':
    "@molecule/app-filesystem: No s'ha definit cap proveïdor. Crida setProvider() amb una implementació de FilesystemProvider (per exemple, des de @molecule/app-filesystem-capacitor).",
}
