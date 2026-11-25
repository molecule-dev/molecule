import type { UploadsTranslations } from './types.js'

/** Uploads translations for Bengali. */
export const bn: UploadsTranslations = {
  'uploads.error.noProvider': 'আপলোড প্রোভাইডার কনফিগার করা হয়নি। প্রথমে setProvider() কল করুন।',
  'uploads.error.streamLimitReached': 'স্ট্রিম সীমায় পৌঁছেছে।',
  'uploads.error.aborted': 'আপলোড বাতিল করা হয়েছে।',
  'uploads.error.fileTypeBlocked': '{{type}} ধরনের ফাইল আপলোড করা যায় না।',
  'uploads.error.activeTypeListed':
    'receiveUploads() {{type}} তালিকাভুক্ত করে, যা ব্রাউজার চালায় এমন একটি ধরন। এটি সংরক্ষণ করতে allowActiveTypes: true দিন, এবং সেই ফাইলগুলি sendUpload() দিয়ে পরিবেশন করুন।',
}
