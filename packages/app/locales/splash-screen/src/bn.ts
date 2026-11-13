import type { SplashScreenTranslations } from './types.js'

/** Splash Screen translations for Bengali. */
export const bn: SplashScreenTranslations = {
  'splashScreen.error.noProvider': 'স্প্ল্যাশ স্ক্রিন প্রোভাইডার কনফিগার করা হয়নি।',
  'splashScreen.warn.configureNotSupported':
    'configure() এই স্প্ল্যাশ স্ক্রিন প্রোভাইডার দ্বারা সমর্থিত নয়।',
  'splashScreen.error.missingDependency':
    '`{{library}}` প্রয়োজন কিন্তু ইনস্টল করা নেই। এটি ইনস্টল করুন: `npx expo install {{library}}`',
}
