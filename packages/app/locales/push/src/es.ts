import type { PushTranslations } from './types.js'

/** Push translations for Spanish. */
export const es: PushTranslations = {
  'push.error.notSupported': 'Las notificaciones push no son compatibles',
  'push.error.permissionNotGranted': 'Permiso de notificación no concedido',
  'push.error.missingDependency':
    '`{{library}}` es necesaria pero no está instalada. Instálela con: `npx expo install {{library}}`',
}
