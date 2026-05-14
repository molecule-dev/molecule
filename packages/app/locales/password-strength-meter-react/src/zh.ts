import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for Chinese (Simplified). */
export const zh: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': '非常弱',
  'passwordStrengthMeter.label.1': '弱',
  'passwordStrengthMeter.label.2': '一般',
  'passwordStrengthMeter.label.3': '良好',
  'passwordStrengthMeter.label.4': '强',
  'passwordStrengthMeter.ariaValueText': '密码强度：{{label}}（4 分中的 {{score}} 分）',
  'passwordStrengthMeter.rule.length': '至少 12 个字符',
  'passwordStrengthMeter.rule.upper': '包含大写字母',
  'passwordStrengthMeter.rule.lower': '包含小写字母',
  'passwordStrengthMeter.rule.digit': '包含数字',
  'passwordStrengthMeter.rule.symbol': '包含符号',
  'passwordStrengthMeter.rule.noCommon': '不是常用密码',
}
