import type { PushTranslations } from './types.js'

/** Push translations for Filipino. */
export const fil: PushTranslations = {
  'push.error.notSupported': 'Hindi sinusuportahan ang push notifications',
  'push.error.permissionNotGranted': 'Hindi ibinigay ang pahintulot para sa notification',
  'push.error.missingDependency':
    'Kinakailangan ang `{{library}}` ngunit hindi pa naka-install. I-install ito gamit ang: `npx expo install {{library}}`',
}
