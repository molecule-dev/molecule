import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for French. */
export const fr: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': 'Très faible',
  'passwordStrengthMeter.label.1': 'Faible',
  'passwordStrengthMeter.label.2': 'Moyen',
  'passwordStrengthMeter.label.3': 'Bon',
  'passwordStrengthMeter.label.4': 'Fort',
  'passwordStrengthMeter.ariaValueText': 'Force du mot de passe : {{label}} ({{score}} sur 4)',
  'passwordStrengthMeter.rule.length': 'Au moins 12 caractères',
  'passwordStrengthMeter.rule.upper': 'Contient une majuscule',
  'passwordStrengthMeter.rule.lower': 'Contient une minuscule',
  'passwordStrengthMeter.rule.digit': 'Contient un chiffre',
  'passwordStrengthMeter.rule.symbol': 'Contient un symbole',
  'passwordStrengthMeter.rule.noCommon': 'Pas un mot de passe courant',
}
