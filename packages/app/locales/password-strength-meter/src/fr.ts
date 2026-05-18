import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for fr. */
export const fr: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Au moins 12 caractères',
  'passwordStrengthMeter.label.0': 'Très faible',
  'passwordStrengthMeter.label.1': 'Faible',
  'passwordStrengthMeter.label.2': 'Équitable',
  'passwordStrengthMeter.label.3': 'Bien',
  'passwordStrengthMeter.label.4': 'Fort',
  'passwordStrengthMeter.ariaValueText':
    'Force du mot de passe :<x> {{étiquette}}</x> (<x> {{score}}</x> de 4)',
  'passwordStrengthMeter.rule.upper': 'Contient une lettre majuscule',
  'passwordStrengthMeter.rule.lower': 'Contient une lettre minuscule',
  'passwordStrengthMeter.rule.digit': 'Contient un chiffre',
  'passwordStrengthMeter.rule.symbol': 'Contient un symbole',
  'passwordStrengthMeter.rule.noCommon': 'Mot de passe inhabituel',
}
