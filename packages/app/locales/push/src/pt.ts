import type { PushTranslations } from './types.js'

/** Push translations for Portuguese. */
export const pt: PushTranslations = {
  'push.error.notSupported': 'As notificações push não são suportadas',
  'push.error.permissionNotGranted': 'Permissão de notificação não concedida',
  'push.error.missingDependency':
    'A `{{library}}` é necessária, mas não está instalada. Instale-a com: `npx expo install {{library}}`',
}
