import type { PushTranslations } from './types.js'

/** Push translations for Vietnamese. */
export const vi: PushTranslations = {
  'push.error.notSupported': 'Không hỗ trợ thông báo đẩy',
  'push.error.permissionNotGranted': 'Chưa cấp quyền thông báo',
  'push.error.missingDependency':
    '`{{library}}` là bắt buộc nhưng chưa được cài đặt. Hãy cài đặt nó bằng lệnh: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'Chưa có service worker nào được đăng ký. Thông báo đẩy cần bản dựng production của ứng dụng có cài @molecule/app-pwa-default.',
}
