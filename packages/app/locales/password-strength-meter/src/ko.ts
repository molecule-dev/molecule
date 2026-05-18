import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for ko. */
export const ko: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': '최소 12자 이상',
  'passwordStrengthMeter.label.0': '매우 약함',
  'passwordStrengthMeter.label.1': '약한',
  'passwordStrengthMeter.label.2': '공정한',
  'passwordStrengthMeter.label.3': '좋은',
  'passwordStrengthMeter.label.4': '강한',
  'passwordStrengthMeter.ariaValueText': '비밀번호 강도:<x> {{상표}}</x> (<x> {{점수}}</x> 4)',
  'passwordStrengthMeter.rule.upper': '대문자가 포함되어 있습니다.',
  'passwordStrengthMeter.rule.lower': '소문자가 포함되어 있습니다.',
  'passwordStrengthMeter.rule.digit': '숫자가 포함되어 있습니다.',
  'passwordStrengthMeter.rule.symbol': '기호가 포함되어 있습니다',
  'passwordStrengthMeter.rule.noCommon': '흔하지 않은 비밀번호입니다',
}
