import type { PushTranslations } from './types.js'

/** Push translations for Khmer. */
export const km: PushTranslations = {
  'push.error.notSupported': 'មិនគាំទ្រការជូនដំណឹង push',
  'push.error.permissionNotGranted': 'មិនបានផ្តល់ការអនុញ្ញាតជូនដំណឹង',
  'push.error.missingDependency':
    'តម្រូវឲ្យមាន `{{library}}` ប៉ុន្តែមិនទាន់បានដំឡើងនៅឡើយទេ។ សូមដំឡើងវាជាមួយ៖ `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'មិនមាន service worker ដែលបានចុះឈ្មោះទេ។ ការជូនដំណឹង push ត្រូវការកំណែផលិតកម្មរបស់កម្មវិធីដែលបានដំឡើង @molecule/app-pwa-default។',
}
