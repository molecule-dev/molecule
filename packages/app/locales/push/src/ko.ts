import type { PushTranslations } from './types.js'

/** Push translations for Korean. */
export const ko: PushTranslations = {
  'push.error.notSupported': '푸시 알림이 지원되지 않습니다',
  'push.error.permissionNotGranted': '알림 권한이 부여되지 않았습니다',
  'push.error.missingDependency':
    '`{{library}}` 필요하지만 설치되어 있지 않습니다. 다음 명령으로 설치하세요: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    '등록된 service worker가 없습니다. 푸시 알림에는 @molecule/app-pwa-default가 설치된 앱의 프로덕션 빌드가 필요합니다.',
}
