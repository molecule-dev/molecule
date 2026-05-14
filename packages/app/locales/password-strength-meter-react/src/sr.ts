import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for Serbian. */
export const sr: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': 'Веома слаба',
  'passwordStrengthMeter.label.1': 'Слаба',
  'passwordStrengthMeter.label.2': 'Осредња',
  'passwordStrengthMeter.label.3': 'Добра',
  'passwordStrengthMeter.label.4': 'Јака',
  'passwordStrengthMeter.ariaValueText': 'Јачина лозинке: {{label}} ({{score}} од 4)',
  'passwordStrengthMeter.rule.length': 'Најмање 12 знакова',
  'passwordStrengthMeter.rule.upper': 'Садржи велико слово',
  'passwordStrengthMeter.rule.lower': 'Садржи мало слово',
  'passwordStrengthMeter.rule.digit': 'Садржи цифру',
  'passwordStrengthMeter.rule.symbol': 'Садржи симбол',
  'passwordStrengthMeter.rule.noCommon': 'Није уобичајена лозинка',
}
