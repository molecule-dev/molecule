import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Khmer. */
export const km: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() មិនត្រូវបានគាំទ្រដោយអ្នកផ្តល់អេក្រង់ចាប់ផ្តើមនេះ។',
  'splashScreen.error.missingDependency':
    'តម្រូវឲ្យមាន `{{library}}` ប៉ុន្តែមិនទាន់បានដំឡើងនៅឡើយទេ។ សូមដំឡើងវាជាមួយ៖ `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: គ្មានការកំណត់អ្នកផ្តល់សេវាទេ។ ហៅ `setProvider()` ជាមួយនឹងការអនុវត្ត `SplashScreenProvider` (ឧទាហរណ៍ ពី `@molecule/app-splash-screen-react-native`)។',
}
