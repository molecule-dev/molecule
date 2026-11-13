import type { PushTranslations } from './types.js'

/** Push translations for Polish. */
export const pl: PushTranslations = {
  'push.error.notSupported': 'Powiadomienia push nie są obsługiwane',
  'push.error.permissionNotGranted': 'Nie udzielono uprawnień do powiadomień',
  'push.error.missingDependency':
    '`{{library}}` jest wymagana, ale nie jest zainstalowana. Zainstaluj ją za pomocą: `npx expo install {{library}}`',
}
