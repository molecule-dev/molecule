import type { AiTranslations } from './types.js'

/** Ai translations for Bengali. */
export const bn: AiTranslations = {
  'ai.error.noProvider': 'AI প্রদানকারী কনফিগার করা হয়নি। প্রথমে একটি AI প্রদানকারী বন্ড করুন।',
  'ai.error.ambiguousProvider':
    'একাধিক নামযুক্ত AI প্রদানকারী বন্ড করা হয়েছে এবং কোনো ডিফল্ট সেট করা হয়নি। একটি নির্বাচন করতে getProviderByName(name) ব্যবহার করুন।',
  'ai.error.responseIncomplete':
    'এআই প্রতিক্রিয়া সম্পূর্ণ হওয়ার আগেই শেষ হয়ে গেছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
  'ai.error.responseTokenLimit':
    'সম্পূর্ণ হওয়ার আগেই এআই প্রতিক্রিয়া আউটপুট টোকেন সীমাতে পৌঁছে গেছে।',
  'ai.error.apiError': 'এআই পরিষেবা ত্রুটি। অনুগ্রহ করে আবার চেষ্টা করুন।',
  'ai.error.noResponseBody': 'এআই পরিষেবা থেকে কোনো সাড়া পাওয়া যায়নি।',
}
