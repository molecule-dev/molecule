import type { PushTranslations } from './types.js'

/** Push translations for Dutch. */
export const nl: PushTranslations = {
  'push.error.notSupported': 'Pushmeldingen worden niet ondersteund',
  'push.error.permissionNotGranted': 'Meldingstoestemming niet verleend',
  'push.error.missingDependency':
    '`{{library}}` is vereist, maar niet geïnstalleerd. Installeer het met: `npx expo install {{library}}`',
}
