import type { FilesystemTranslations } from './types.js'

/** Filesystem translations for Hungarian. */
export const hu: FilesystemTranslations = {
  'filesystem.error.noProvider':
    '@molecule/app-filesystem: Nincs szolgáltató beállítva. Hívja meg a setProvider()-t egy FilesystemProvider implementációval (pl. a @molecule/app-filesystem-capacitor-ból).',
}
