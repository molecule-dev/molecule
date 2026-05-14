import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for Korean. */
export const ko: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': '매우 약함',
  'passwordStrengthMeter.label.1': '약함',
  'passwordStrengthMeter.label.2': '보통',
  'passwordStrengthMeter.label.3': '양호',
  'passwordStrengthMeter.label.4': '강함',
  'passwordStrengthMeter.ariaValueText': '비밀번호 강도: {{label}} (4점 중 {{score}}점)',
  'passwordStrengthMeter.rule.length': '12자 이상',
  'passwordStrengthMeter.rule.upper': '대문자 포함',
  'passwordStrengthMeter.rule.lower': '소문자 포함',
  'passwordStrengthMeter.rule.digit': '숫자 포함',
  'passwordStrengthMeter.rule.symbol': '기호 포함',
  'passwordStrengthMeter.rule.noCommon': '흔한 비밀번호 아님',
}
