import type { PushTranslations } from './types.js'

/** Push translations for Bengali. */
export const bn: PushTranslations = {
  'push.error.notSupported': 'পুশ বিজ্ঞপ্তি সমর্থিত নয়',
  'push.error.permissionNotGranted': 'বিজ্ঞপ্তির অনুমতি দেওয়া হয়নি',
  'push.error.missingDependency':
    '`{{library}}` প্রয়োজন কিন্তু ইনস্টল করা নেই। এটি ইনস্টল করুন: `npx expo install {{library}}`',
}
