import type { PushTranslations } from './types.js'

/** Push translations for Azerbaijani. */
export const az: PushTranslations = {
  'push.error.notSupported': 'Push bildirişləri dəstəklənmir',
  'push.error.permissionNotGranted': 'Bildiriş icazəsi verilməyib',
  'push.error.missingDependency':
    '`{{library}}` tələb olunur, lakin quraşdırılmayıb. Bunu bu şəkildə quraşdırın: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Heç bir service worker qeydiyyatdan keçməyib. Push bildirişləri @molecule/app-pwa-default quraşdırılmış tətbiqin istehsal quruluşunu tələb edir.',
}
