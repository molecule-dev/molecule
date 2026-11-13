import type { PushTranslations } from './types.js'

/** Push translations for Catalan. */
export const ca: PushTranslations = {
  'push.error.notSupported': 'Les notificacions push no són compatibles',
  'push.error.permissionNotGranted': 'Permís de notificació no concedit',
  'push.error.missingDependency':
    '`{{library}}` és obligatori però no està instal·lat. Instal·leu-lo amb: `npx expo install {{library}}`',
}
