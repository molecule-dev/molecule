import type { PushTranslations } from './types.js'

/** Push translations for Punjabi. */
export const pa: PushTranslations = {
  'push.error.notSupported': 'ਪੁਸ਼ ਸੂਚਨਾਵਾਂ ਸਮਰਥਿਤ ਨਹੀਂ ਹਨ',
  'push.error.permissionNotGranted': 'ਸੂਚਨਾ ਇਜਾਜ਼ਤ ਨਹੀਂ ਦਿੱਤੀ ਗਈ',
  'push.error.missingDependency':
    '`{{library}}` ਦੀ ਲੋੜ ਹੈ ਪਰ ਇੰਸਟਾਲ ਨਹੀਂ ਹੈ। ਇਸਨੂੰ ਇਸ ਨਾਲ ਇੰਸਟਾਲ ਕਰੋ: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'ਕੋਈ service worker ਰਜਿਸਟਰ ਨਹੀਂ ਹੈ। ਪੁਸ਼ ਸੂਚਨਾਵਾਂ ਲਈ @molecule/app-pwa-default ਇੰਸਟਾਲ ਕੀਤੀ ਐਪ ਦਾ ਪ੍ਰੋਡਕਸ਼ਨ ਬਿਲਡ ਲੋੜੀਂਦਾ ਹੈ।',
}
