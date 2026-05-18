import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for ro. */
export const ro: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Cel puțin 12 caractere',
  'passwordStrengthMeter.label.0': 'Foarte slab',
  'passwordStrengthMeter.label.1': 'Slab',
  'passwordStrengthMeter.label.2': 'Târg',
  'passwordStrengthMeter.label.3': 'Bun',
  'passwordStrengthMeter.label.4': 'Puternic',
  'passwordStrengthMeter.ariaValueText':
    'Puterea parolei:<x> {{eticheta}}</x> (<x> {{Scor}}</x> din 4)',
  'passwordStrengthMeter.rule.upper': 'Conține o literă mare',
  'passwordStrengthMeter.rule.lower': 'Conține o literă mică',
  'passwordStrengthMeter.rule.digit': 'Conține o cifră',
  'passwordStrengthMeter.rule.symbol': 'Conține un simbol',
  'passwordStrengthMeter.rule.noCommon': 'Nu este o parolă comună',
}
