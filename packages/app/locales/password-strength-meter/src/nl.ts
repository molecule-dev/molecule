import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for nl. */
export const nl: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Minimaal 12 tekens',
  'passwordStrengthMeter.label.0': 'Heel zwak',
  'passwordStrengthMeter.label.1': 'Zwak',
  'passwordStrengthMeter.label.2': 'Eerlijk',
  'passwordStrengthMeter.label.3': 'Goed',
  'passwordStrengthMeter.label.4': 'Sterk',
  'passwordStrengthMeter.ariaValueText':
    'Wachtwoordsterkte:<x> {{label}}</x> (<x> {{score}}</x> van 4)',
  'passwordStrengthMeter.rule.upper': 'Bevat een hoofdletter',
  'passwordStrengthMeter.rule.lower': 'Bevat een kleine letter',
  'passwordStrengthMeter.rule.digit': 'Bevat een cijfer',
  'passwordStrengthMeter.rule.symbol': 'Bevat een symbool',
  'passwordStrengthMeter.rule.noCommon': 'Geen veelvoorkomend wachtwoord',
}
