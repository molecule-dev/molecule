import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for it. */
export const it: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Almeno 12 caratteri',
  'passwordStrengthMeter.label.0': 'Molto debole',
  'passwordStrengthMeter.label.1': 'Debole',
  'passwordStrengthMeter.label.2': 'Giusto',
  'passwordStrengthMeter.label.3': 'Bene',
  'passwordStrengthMeter.label.4': 'Forte',
  'passwordStrengthMeter.ariaValueText':
    'Complessità della password:<x> {{etichetta}}</x> {{punto}} di 4)',
  'passwordStrengthMeter.rule.upper': 'Contiene una lettera maiuscola',
  'passwordStrengthMeter.rule.lower': 'Contiene una lettera minuscola',
  'passwordStrengthMeter.rule.digit': 'Contiene una cifra',
  'passwordStrengthMeter.rule.symbol': 'Contiene un simbolo',
  'passwordStrengthMeter.rule.noCommon': 'Non è una password comune',
}
