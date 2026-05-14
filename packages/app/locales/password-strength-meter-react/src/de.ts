import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for German. */
export const de: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': 'Sehr schwach',
  'passwordStrengthMeter.label.1': 'Schwach',
  'passwordStrengthMeter.label.2': 'Mittel',
  'passwordStrengthMeter.label.3': 'Gut',
  'passwordStrengthMeter.label.4': 'Stark',
  'passwordStrengthMeter.ariaValueText': 'Passwortstärke: {{label}} ({{score}} von 4)',
  'passwordStrengthMeter.rule.length': 'Mindestens 12 Zeichen',
  'passwordStrengthMeter.rule.upper': 'Enthält Großbuchstaben',
  'passwordStrengthMeter.rule.lower': 'Enthält Kleinbuchstaben',
  'passwordStrengthMeter.rule.digit': 'Enthält eine Ziffer',
  'passwordStrengthMeter.rule.symbol': 'Enthält ein Symbol',
  'passwordStrengthMeter.rule.noCommon': 'Kein gängiges Passwort',
}
