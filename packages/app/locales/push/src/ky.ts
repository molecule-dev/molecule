import type { PushTranslations } from './types.js'

/** Push translations for Kyrgyz. */
export const ky: PushTranslations = {
  'push.error.notSupported': 'Push-билдирүүлөр колдоого алынбайт',
  'push.error.permissionNotGranted': 'Билдирүү уруксаты берилген жок',
  'push.error.missingDependency':
    '`{{library}}` талап кылынат, бирок орнотулган эмес. Аны төмөнкү менен орнотуңуз: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Бир дагы service worker катталган эмес. Push билдирмелери үчүн @molecule/app-pwa-default орнотулган колдонмонун өндүрүштүк жыйнагы керек.',
}
