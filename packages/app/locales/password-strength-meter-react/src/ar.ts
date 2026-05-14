import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for Arabic. */
export const ar: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': 'ضعيفة جدًا',
  'passwordStrengthMeter.label.1': 'ضعيفة',
  'passwordStrengthMeter.label.2': 'متوسطة',
  'passwordStrengthMeter.label.3': 'جيدة',
  'passwordStrengthMeter.label.4': 'قوية',
  'passwordStrengthMeter.ariaValueText': 'قوة كلمة المرور: {{label}} ({{score}} من 4)',
  'passwordStrengthMeter.rule.length': '12 حرفًا على الأقل',
  'passwordStrengthMeter.rule.upper': 'تحتوي على حرف كبير',
  'passwordStrengthMeter.rule.lower': 'تحتوي على حرف صغير',
  'passwordStrengthMeter.rule.digit': 'تحتوي على رقم',
  'passwordStrengthMeter.rule.symbol': 'تحتوي على رمز',
  'passwordStrengthMeter.rule.noCommon': 'ليست كلمة مرور شائعة',
}
