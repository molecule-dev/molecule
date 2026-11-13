import type { PushTranslations } from './types.js'

/** Push translations for Croatian. */
export const hr: PushTranslations = {
  'push.error.notSupported': 'Push obavijesti nisu podržane',
  'push.error.permissionNotGranted': 'Dozvola za obavijesti nije odobrena',
  'push.error.missingDependency':
    '`{{library}}` je potreban, ali nije instaliran. Instalirajte ga s: `npx expo install {{library}}`',
}
