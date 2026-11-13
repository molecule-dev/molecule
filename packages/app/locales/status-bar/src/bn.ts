import type { StatusBarTranslations } from './types.js'

/** Status Bar translations for Bengali. */
export const bn: StatusBarTranslations = {
  'statusBar.error.noProvider':
    '@molecule/app-status-bar: কোনো প্রদানকারী সেট করা হয়নি। একটি StatusBarProvider বাস্তবায়ন দিয়ে setProvider() কল করুন (যেমন @molecule/app-status-bar-react-native থেকে)।',
  'statusBar.error.missingDependency': '`{{library}}` প্রয়োজন কিন্তু ইনস্টল করা নেই।',
}
