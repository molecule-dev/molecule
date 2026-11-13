import type { PushTranslations } from './types.js'

/** Push translations for Finnish. */
export const fi: PushTranslations = {
  'push.error.notSupported': 'Push-ilmoituksia ei tueta',
  'push.error.permissionNotGranted': 'Ilmoituslupaa ei myönnetty',
  'push.error.missingDependency':
    '`{{library}}` on pakollinen, mutta sitä ei ole asennettu. Asenna se komennolla: `npx expo install {{library}}`',
}
