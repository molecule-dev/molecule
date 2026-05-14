import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for Japanese. */
export const ja: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': '非常に弱い',
  'passwordStrengthMeter.label.1': '弱い',
  'passwordStrengthMeter.label.2': '普通',
  'passwordStrengthMeter.label.3': '良い',
  'passwordStrengthMeter.label.4': '強い',
  'passwordStrengthMeter.ariaValueText': 'パスワードの強度: {{label}}（4段階中 {{score}}）',
  'passwordStrengthMeter.rule.length': '12文字以上',
  'passwordStrengthMeter.rule.upper': '大文字を含む',
  'passwordStrengthMeter.rule.lower': '小文字を含む',
  'passwordStrengthMeter.rule.digit': '数字を含む',
  'passwordStrengthMeter.rule.symbol': '記号を含む',
  'passwordStrengthMeter.rule.noCommon': 'よく使われるパスワードではない',
}
