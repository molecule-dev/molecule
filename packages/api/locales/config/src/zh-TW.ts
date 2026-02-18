import type { ConfigTranslations } from './types.js'

/** Config translations for Chinese (Traditional). */
export const zhTW: ConfigTranslations = {
  'config.error.required': "必需的設定 '{{key}}' 未設定。",
  'config.error.mustBeNumber': "設定 '{{key}}' 必須是一個數字。",
  'config.error.minValue': "設定 '{{key}}' 必須至少為 {{min}}。",
  'config.error.maxValue': "設定 '{{key}}' 最多為 {{max}}。",
  'config.error.mustBeBoolean': "設定 '{{key}}' 必須是布林值 (true/false/1/0)。",
  'config.error.mustBeJson': "設定 '{{key}}' 必須是有效的 JSON。",
  'config.error.patternMismatch': "設定 '{{key}}' 與模式 '{{pattern}}' 不符合。",
  'config.error.invalidEnum': "設定 '{{key}}' 必須是以下之一: {{values}}。",
  'config.error.validationNotSupported': '目前設定提供者不支援驗證。',
}
