import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for nb. */
export const nb: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Minst 12 tegn',
  'passwordStrengthMeter.label.0': 'Veldig svak',
  'passwordStrengthMeter.label.1': 'Svak',
  'passwordStrengthMeter.label.2': 'Rettferdig',
  'passwordStrengthMeter.label.3': 'God',
  'passwordStrengthMeter.label.4': 'Sterk',
  'passwordStrengthMeter.ariaValueText':
    'Passordstyrke:<x> {{merkelapp}}</x> (<x> {{poengsum}}</x> av 4)',
  'passwordStrengthMeter.rule.upper': 'Inneholder en stor bokstav',
  'passwordStrengthMeter.rule.lower': 'Inneholder en liten bokstav',
  'passwordStrengthMeter.rule.digit': 'Inneholder et siffer',
  'passwordStrengthMeter.rule.symbol': 'Inneholder et symbol',
  'passwordStrengthMeter.rule.noCommon': 'Ikke et vanlig passord',
}
