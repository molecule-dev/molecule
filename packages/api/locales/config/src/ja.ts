import type { ConfigTranslations } from './types.js'

/** Config translations for Japanese. */
export const ja: ConfigTranslations = {
  'config.error.required': "必須の設定 '{{key}}' が設定されていません。",
  'config.error.mustBeNumber': "設定 '{{key}}' は数値である必要があります。",
  'config.error.minValue': "設定 '{{key}}' は少なくとも {{min}} である必要があります。",
  'config.error.maxValue': "設定 '{{key}}' は最大 {{max}} である必要があります。",
  'config.error.mustBeBoolean': "設定 '{{key}}' はブール値である必要があります (true/false/1/0)。",
  'config.error.mustBeJson': "設定 '{{key}}' は有効な JSON である必要があります。",
  'config.error.patternMismatch': "設定 '{{key}}' はパターン '{{pattern}}' と一致しません。",
  'config.error.invalidEnum': "設定 '{{key}}' は次のいずれかである必要があります: {{values}}。",
  'config.error.validationNotSupported': '現在の設定プロバイダーは検証をサポートしていません。',
}
