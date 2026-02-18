import type { ConfigTranslations } from './types.js'

/** Config translations for Urdu. */
export const ur: ConfigTranslations = {
  'config.error.required': "مطلوبہ کنفیگریشن '{{key}}' سیٹ نہیں ہے۔",
  'config.error.mustBeNumber': "کنفیگریشن '{{key}}' ایک نمبر ہونا چاہیے۔",
  'config.error.minValue': "کنفیگریشن '{{key}}' کم از کم {{min}} ہونا چاہیے۔",
  'config.error.maxValue': "کنفیگریشن '{{key}}' زیادہ سے زیادہ {{max}} ہونا چاہیے۔",
  'config.error.mustBeBoolean': "کنفیگریشن '{{key}}' بولین ہونا چاہیے (true/false/1/0)۔",
  'config.error.mustBeJson': "کنفیگریشن '{{key}}' درست JSON ہونا چاہیے۔",
  'config.error.patternMismatch': "کنفیگریشن '{{key}}' پیٹرن '{{pattern}}' سے مطابقت نہیں رکھتی۔",
  'config.error.invalidEnum': "کنفیگریشن '{{key}}' ان میں سے ایک ہونا چاہیے: {{values}}۔",
  'config.error.validationNotSupported': 'موجودہ کنفیگریشن فراہم کنندہ توثیق کی حمایت نہیں کرتا۔',
}
