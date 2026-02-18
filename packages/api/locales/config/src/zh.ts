import type { ConfigTranslations } from './types.js'

/** Config translations for Chinese. */
export const zh: ConfigTranslations = {
  'config.error.required': "必需的配置 '{{key}}' 未设置。",
  'config.error.mustBeNumber': "配置 '{{key}}' 必须是一个数字。",
  'config.error.minValue': "配置 '{{key}}' 必须至少为 {{min}}。",
  'config.error.maxValue': "配置 '{{key}}' 最多为 {{max}}。",
  'config.error.mustBeBoolean': "配置 '{{key}}' 必须是布尔值 (true/false/1/0)。",
  'config.error.mustBeJson': "配置 '{{key}}' 必须是有效的 JSON。",
  'config.error.patternMismatch': "配置 '{{key}}' 与模式 '{{pattern}}' 不匹配。",
  'config.error.invalidEnum': "配置 '{{key}}' 必须是以下之一: {{values}}。",
  'config.error.validationNotSupported': '当前配置提供程序不支持验证。',
}
