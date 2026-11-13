import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Lao. */
export const lo: SplashScreenTranslations = {
  'splashScreen.warn.configureNotSupported':
    'configure() ບໍ່ຮອງຮັບໂດຍຜູ້ໃຫ້ບໍລິການໜ້າຈໍເລີ່ມຕົ້ນນີ້.',
  'splashScreen.error.missingDependency':
    'ຕ້ອງມີ `{{library}}` ແຕ່ຍັງບໍ່ໄດ້ຕິດຕັ້ງ. ຕິດຕັ້ງມັນດ້ວຍ: `npx expo install {{library}}`',
  'splashScreen.error.noProvider':
    '`@molecule/app-splash-screen`: ບໍ່ໄດ້ຕັ້ງຜູ້ໃຫ້ບໍລິການໄວ້. ເອີ້ນ `setProvider()` ດ້ວຍການຈັດຕັ້ງປະຕິບັດ `SplashScreenProvider` (ຕົວຢ່າງ, ຈາກ `@molecule/app-splash-screen-react-native`).',
}
