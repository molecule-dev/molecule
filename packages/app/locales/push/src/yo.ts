import type { PushTranslations } from './types.js'

/** Push translations for Yoruba. */
export const yo: PushTranslations = {
  'push.error.notSupported': 'Ìfitónilétí tí a ti tì kò ní àtìlẹ́yìn',
  'push.error.permissionNotGranted': 'A kò fún ni àṣẹ ìfitónilétí',
  'push.error.missingDependency':
    '`{{library}}` pọndandan ṣùgbọ́n a kò fi sori ẹrọ. Fi sori ẹrọ pẹlu: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Kò sí service worker tí a forúkọsílẹ̀. Àwọn ìfitónilétí push nílò ẹ̀dà ìgbéjáde ti áàpù náà pẹ̀lú @molecule/app-pwa-default tí a fi sórí ẹ̀rọ.',
}
