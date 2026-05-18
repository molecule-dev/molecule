import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for ja. */
export const ja: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': '12文字以上',
  'passwordStrengthMeter.label.0': '非常に弱い',
  'passwordStrengthMeter.label.1': '弱い',
  'passwordStrengthMeter.label.2': '公平',
  'passwordStrengthMeter.label.3': '良い',
  'passwordStrengthMeter.label.4': '強い',
  'passwordStrengthMeter.ariaValueText':
    'パスワードの強度:<x> {{ラベル}}</x> （<x> {{スコア}}</x> 4分の1)',
  'passwordStrengthMeter.rule.upper': '大文字が含まれています',
  'passwordStrengthMeter.rule.lower': '小文字が含まれています',
  'passwordStrengthMeter.rule.digit': '数字が含まれています',
  'passwordStrengthMeter.rule.symbol': 'シンボルが含まれています',
  'passwordStrengthMeter.rule.noCommon': '一般的なパスワードではありません',
}
