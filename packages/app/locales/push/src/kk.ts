import type { PushTranslations } from './types.js'

/** Push translations for Kazakh. */
export const kk: PushTranslations = {
  'push.error.notSupported': 'Push хабарландырулар қолдау көрсетілмейді',
  'push.error.permissionNotGranted': 'Хабарландыру рұқсаты берілмеген',
  'push.error.missingDependency':
    '`{{library}}` қажет, бірақ орнатылмаған. Оны келесідей орнатыңыз: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Ешбір service worker тіркелмеген. Push хабарландырулары үшін @molecule/app-pwa-default орнатылған қолданбаның өндірістік жинағы қажет.',
}
