import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for Danish. */
export const da: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': 'Meget svag',
  'passwordStrengthMeter.label.1': 'Svag',
  'passwordStrengthMeter.label.2': 'Nogenlunde',
  'passwordStrengthMeter.label.3': 'God',
  'passwordStrengthMeter.label.4': 'Stærk',
  'passwordStrengthMeter.ariaValueText': 'Adgangskodestyrke: {{label}} ({{score}} af 4)',
  'passwordStrengthMeter.rule.length': 'Mindst 12 tegn',
  'passwordStrengthMeter.rule.upper': 'Indeholder stort bogstav',
  'passwordStrengthMeter.rule.lower': 'Indeholder lille bogstav',
  'passwordStrengthMeter.rule.digit': 'Indeholder et tal',
  'passwordStrengthMeter.rule.symbol': 'Indeholder et symbol',
  'passwordStrengthMeter.rule.noCommon': 'Ikke en almindelig adgangskode',
}
