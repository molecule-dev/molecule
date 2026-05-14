import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for Chinese (Traditional). */
export const zhTW: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': '非常弱',
  'passwordStrengthMeter.label.1': '弱',
  'passwordStrengthMeter.label.2': '普通',
  'passwordStrengthMeter.label.3': '良好',
  'passwordStrengthMeter.label.4': '強',
  'passwordStrengthMeter.ariaValueText': '密碼強度：{{label}}（4 分中的 {{score}} 分）',
  'passwordStrengthMeter.rule.length': '至少 12 個字元',
  'passwordStrengthMeter.rule.upper': '包含大寫字母',
  'passwordStrengthMeter.rule.lower': '包含小寫字母',
  'passwordStrengthMeter.rule.digit': '包含數字',
  'passwordStrengthMeter.rule.symbol': '包含符號',
  'passwordStrengthMeter.rule.noCommon': '不是常用密碼',
}
