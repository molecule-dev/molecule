import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Korean. */
export const ko: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure()는 이 스플래시 스크린 공급자에서 지원되지 않습니다.',
  'splashScreen.error.missingDependency':
    '`{{library}}` 필요하지만 설치되어 있지 않습니다. 다음 명령으로 설치하세요: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: 프로바이더가 설정되지 않았습니다. `@molecule/app-splash-screen-react-native` 의 `SplashScreenProvider` 구현체를 사용하여 `setProvider()` 호출하십시오.',
}
