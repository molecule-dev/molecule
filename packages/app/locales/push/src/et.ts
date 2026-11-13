import type { PushTranslations } from './types.js'

/** Push translations for Estonian. */
export const et: PushTranslations = {
  'push.error.notSupported': 'Tõuketeatised pole toetatud',
  'push.error.permissionNotGranted': 'Teavituse luba ei antud',
  'push.error.missingDependency':
    '`{{library}}` on nõutav, aga pole installitud. Installige see käsuga: `npx expo install {{library}}`',
}
