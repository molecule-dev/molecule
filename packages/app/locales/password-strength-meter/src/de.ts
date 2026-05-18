import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for de. */
export const de: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Mindestens 12 Zeichen',
  'passwordStrengthMeter.label.0': 'Sehr schwach',
  'passwordStrengthMeter.label.1': 'Schwach',
  'passwordStrengthMeter.label.2': 'Gerecht',
  'passwordStrengthMeter.label.3': 'Gut',
  'passwordStrengthMeter.label.4': 'Stark',
  'passwordStrengthMeter.ariaValueText':
    'Passwortstärke:<x> {{Etikett}}</x> (<x> {{Punktzahl}}</x> von 4)',
  'passwordStrengthMeter.rule.upper': 'Enthält einen Großbuchstaben',
  'passwordStrengthMeter.rule.lower': 'Enthält einen Kleinbuchstaben',
  'passwordStrengthMeter.rule.digit': 'Enthält eine Ziffer',
  'passwordStrengthMeter.rule.symbol': 'Enthält ein Symbol',
  'passwordStrengthMeter.rule.noCommon': 'Kein gängiges Passwort',
}
