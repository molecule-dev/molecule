import type { PushTranslations } from './types.js'

/** Push translations for Bengali. */
export const bn: PushTranslations = {
  'push.error.notSupported': 'পুশ বিজ্ঞপ্তি সমর্থিত নয়',
  'push.error.permissionNotGranted': 'বিজ্ঞপ্তির অনুমতি দেওয়া হয়নি',
  'push.error.missingDependency':
    '`{{library}}` প্রয়োজন কিন্তু ইনস্টল করা নেই। এটি ইনস্টল করুন: `npx expo install {{library}}`',
  'push.error.noServiceWorker':
    'কোনো service worker নিবন্ধিত নেই। পুশ বিজ্ঞপ্তির জন্য @molecule/app-pwa-default ইনস্টল করা অ্যাপের প্রোডাকশন বিল্ড প্রয়োজন।',
}
