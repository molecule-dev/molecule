import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Bengali. */
export const bn: MarkdownTranslations = {
  'markdown.components.invalid':
    'components-এ এমন একটি এন্ট্রি আছে যা React কম্পোনেন্ট বা এলিমেন্টের নাম নয়।',
  'markdown.components.unsupported':
    'marked প্রোভাইডার components ব্যবহার করতে পারে না, কারণ এটি HTML স্ট্রিং ফেরত দেয়। অ্যাট্রিবিউট যোগ করতে elementAttributes ব্যবহার করুন।',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" কোনো অ্যাট্রিবিউট নাম নয় (<{{element}}>-এ)',
  'markdown.elementAttributes.refused':
    'elementAttributes <{{element}}>-এ "{{name}}" সেট করতে পারে না: এটি রেন্ডারারের মালিকানাধীন',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes <{{element}}> নাম দেয়, যা markdown তৈরি করে না',
  'markdown.footnotes.backToReference': 'রেফারেন্স {{reference}}-এ ফিরে যান',
  'markdown.footnotes.label': 'পাদটীকা',
}
