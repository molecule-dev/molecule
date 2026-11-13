import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Bengali. */
export const bn: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'কোনো প্রতিক্রিয়া বডি নেই',
  'chat.error.streamError': 'স্ট্রিম ত্রুটি',
  'chat.error.unknownError': 'অজানা ত্রুটি',
  'chat.error.sendFailed': 'বার্তা পাঠাতে ব্যর্থ হয়েছে',
  'chat.error.stalled':
    '{{agentName}} সাড়া দেওয়া বন্ধ করে দিয়েছে। এটি হয়তো এখনও ব্যাকগ্রাউন্ডে শেষ হচ্ছে — সর্বশেষ আপডেট দেখতে রিলোড করুন, অথবা একটি নতুন বার্তা পাঠান।',
  'aiChat.error.noProvider':
    'এআই চ্যাট প্রদানকারী কনফিগার করা নেই। প্রথমে একটি এআই চ্যাট প্রদানকারী যুক্ত করুন।',
}
