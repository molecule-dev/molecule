import type { ConfigTranslations } from './types.js'

/** Config translations for Bengali. */
export const bn: ConfigTranslations = {
  'config.error.required': "প্রয়োজনীয় কনফিগারেশন '{{key}}' সেট করা নেই।",
  'config.error.mustBeNumber': "কনফিগারেশন '{{key}}' অবশ্যই একটি সংখ্যা হতে হবে।",
  'config.error.minValue': "কনফিগারেশন '{{key}}' অবশ্যই কমপক্ষে {{min}} হতে হবে।",
  'config.error.maxValue': "কনফিগারেশন '{{key}}' সর্বাধিক {{max}} হতে হবে।",
  'config.error.mustBeBoolean':
    "কনফিগারেশন '{{key}}' অবশ্যই একটি বুলিয়ান হতে হবে (true/false/1/0)।",
  'config.error.mustBeJson': "কনফিগারেশন '{{key}}' অবশ্যই বৈধ JSON হতে হবে।",
  'config.error.patternMismatch': "কনফিগারেশন '{{key}}' প্যাটার্ন '{{pattern}}' এর সাথে মেলে না।",
  'config.error.invalidEnum': "কনফিগারেশন '{{key}}' অবশ্যই এর মধ্যে একটি হতে হবে: {{values}}।",
  'config.error.validationNotSupported': 'বর্তমান কনফিগারেশন প্রদানকারী যাচাইকরণ সমর্থন করে না।',
}
