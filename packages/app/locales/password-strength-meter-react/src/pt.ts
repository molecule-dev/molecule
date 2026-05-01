import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for Portuguese (TODO: translate). */
export const pt: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': 'Very weak',
  'passwordStrengthMeter.label.1': 'Weak',
  'passwordStrengthMeter.label.2': 'Fair',
  'passwordStrengthMeter.label.3': 'Good',
  'passwordStrengthMeter.label.4': 'Strong',
  'passwordStrengthMeter.ariaValueText': 'Password strength: {{label}} ({{score}} of 4)',
  'passwordStrengthMeter.rule.length': 'At least 12 characters',
  'passwordStrengthMeter.rule.upper': 'Contains an uppercase letter',
  'passwordStrengthMeter.rule.lower': 'Contains a lowercase letter',
  'passwordStrengthMeter.rule.digit': 'Contains a digit',
  'passwordStrengthMeter.rule.symbol': 'Contains a symbol',
  'passwordStrengthMeter.rule.noCommon': 'Not a common password',
}
