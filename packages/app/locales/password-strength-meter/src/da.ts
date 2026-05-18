import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for da. */
export const da: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Mindst 12 tegn',
  'passwordStrengthMeter.label.0': 'Meget svag',
  'passwordStrengthMeter.label.1': 'Svag',
  'passwordStrengthMeter.label.2': 'Retfærdig',
  'passwordStrengthMeter.label.3': 'God',
  'passwordStrengthMeter.label.4': 'Stærk',
  'passwordStrengthMeter.ariaValueText':
    'Adgangskodestyrke:<x> {{mærke}}</x> (<x> {{score}}</x> af 4)',
  'passwordStrengthMeter.rule.upper': 'Indeholder et stort bogstav',
  'passwordStrengthMeter.rule.lower': 'Indeholder et lille bogstav',
  'passwordStrengthMeter.rule.digit': 'Indeholder et ciffer',
  'passwordStrengthMeter.rule.symbol': 'Indeholder et symbol',
  'passwordStrengthMeter.rule.noCommon': 'Ikke en almindelig adgangskode',
}
