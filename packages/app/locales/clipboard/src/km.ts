import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Khmer. */
export const km: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: គ្មានអ្នកផ្តល់សេវាត្រូវបានកំណត់ទេ។ ហៅ setProvider() ជាមួយការអនុវត្ត ClipboardProvider (ឧ., ពី @molecule/app-clipboard-react-native)។',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange មិនត្រូវបានគាំទ្រដោយអ្នកផ្តល់សេវាទេ',
  'clipboard.error.missingDependency':
    'តម្រូវឲ្យមាន `{{library}}` ប៉ុន្តែមិនទាន់បានដំឡើងនៅឡើយទេ។ សូមដំឡើងវាជាមួយ៖ `npm install {{library}}`',
}
