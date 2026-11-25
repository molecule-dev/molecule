import type { PushTranslations } from './types.js'

/** Push translations for Malay. */
export const ms: PushTranslations = {
  'push.error.notSupported': 'Pemberitahuan push tidak disokong',
  'push.error.permissionNotGranted': 'Kebenaran pemberitahuan tidak diberikan',
  'push.error.missingDependency':
    '`{{library}}` diperlukan tetapi tidak dipasang. Pasangkannya dengan: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Tiada service worker yang didaftarkan. Pemberitahuan tolak memerlukan binaan pengeluaran aplikasi dengan @molecule/app-pwa-default dipasang.',
}
