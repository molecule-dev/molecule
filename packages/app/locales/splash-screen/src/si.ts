import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Sinhala. */
export const si: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported': 'configure() මෙම ස්ප්ලෑෂ් තිර සපයන්නා සහාය නොදක්වයි.',
  'splashScreen.error.missingDependency':
    '`{{library}}` අවශ්‍යයි නමුත් ස්ථාපනය කර නැත. `npx expo install {{library}}` සමඟ එය ස්ථාපනය කරන්න.',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: සැපයුම්කරු සකසා නැත. `SplashScreenProvider` ක්‍රියාත්මක කිරීමක් සහිත `setProvider()` අමතන්න (උදා: `@molecule/app-splash-screen-react-native` වෙතින්).',
}
