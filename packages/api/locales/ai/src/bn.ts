import type { AiTranslations } from './types.js'

/** Ai translations for Bengali. */
export const bn: AiTranslations = {
  'ai.error.noProvider': 'AI প্রদানকারী কনফিগার করা হয়নি। প্রথমে একটি AI প্রদানকারী বন্ড করুন।',
  'ai.error.apiError': 'AI API অনুরোধ ব্যর্থ হয়েছে।',
  'ai.error.noResponseBody': 'AI প্রতিক্রিয়ার বডি খালি।',
  'ai.error.ambiguousProvider':
    'একাধিক নামযুক্ত AI প্রদানকারী বন্ড করা হয়েছে এবং কোনো ডিফল্ট সেট করা হয়নি। একটি নির্বাচন করতে getProviderByName(name) ব্যবহার করুন।',
}
