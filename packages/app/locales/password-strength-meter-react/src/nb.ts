import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for Norwegian Bokmal. */
export const nb: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': 'Veldig svakt',
  'passwordStrengthMeter.label.1': 'Svakt',
  'passwordStrengthMeter.label.2': 'Middels',
  'passwordStrengthMeter.label.3': 'Bra',
  'passwordStrengthMeter.label.4': 'Sterkt',
  'passwordStrengthMeter.ariaValueText': 'Passordstyrke: {{label}} ({{score}} av 4)',
  'passwordStrengthMeter.rule.length': 'Minst 12 tegn',
  'passwordStrengthMeter.rule.upper': 'Inneholder stor bokstav',
  'passwordStrengthMeter.rule.lower': 'Inneholder liten bokstav',
  'passwordStrengthMeter.rule.digit': 'Inneholder et tall',
  'passwordStrengthMeter.rule.symbol': 'Inneholder et symbol',
  'passwordStrengthMeter.rule.noCommon': 'Ikke et vanlig passord',
}
