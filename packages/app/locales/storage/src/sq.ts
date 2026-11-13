import type { StorageTranslations } from './types.js'

/** Storage translations for Albanian. */
export const sq: StorageTranslations = {
  'storage.error.noProvider':
    'Ofruesi i ruajtjes nuk është konfiguruar. Thirrni setProvider() fillimisht.',
  'storage.error.quotaExceeded': 'Kuota e ruajtjes u tejkalua gjatë vendosjes së çelësit "{{key}}"',
  'storage.error.asyncStorageUnavailable':
    '`@react-native-async-storage/async-storage` nuk është instaluar. Instalojeni me: `npm install @react-native-async-storage/async-storage`',
  'storage.error.setFailed': 'Dështoi vendosja e vlerës për çelësin " {{key}} " në AsyncStorage',
}
