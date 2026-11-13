import type { AiTranslations } from './types.js'

/** Ai translations for Georgian. */
export const ka: AiTranslations = {
  'ai.error.noProvider': 'AI პროვაიდერი არ არის კონფიგურირებული. ჯერ დააკავშირეთ AI პროვაიდერი.',
  'ai.error.ambiguousProvider':
    'დაკავშირებულია რამდენიმე სახელდებული AI პროვაიდერი და ნაგულისხმევი არ არის დაყენებული. გამოიყენეთ getProviderByName(name) ერთის ასარჩევად.',
  'ai.error.responseIncomplete':
    'ხელოვნური ინტელექტის პასუხი დასრულებამდე დასრულდა. გთხოვთ, სცადოთ ხელახლა.',
  'ai.error.responseTokenLimit':
    'ხელოვნური ინტელექტის პასუხმა დასრულებამდე მიაღწია გამომავალი ტოკენების ლიმიტს.',
  'ai.error.apiError': 'ხელოვნური ინტელექტის სერვისის შეცდომა. გთხოვთ, სცადოთ ხელახლა.',
  'ai.error.noResponseBody': 'ხელოვნური ინტელექტის სერვისიდან პასუხი არ არის.',
}
