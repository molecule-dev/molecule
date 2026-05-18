import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for pt. */
export const pt: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Pelo menos 12 caracteres',
  'passwordStrengthMeter.label.0': 'Muito fraco',
  'passwordStrengthMeter.label.1': 'Fraco',
  'passwordStrengthMeter.label.2': 'Justo',
  'passwordStrengthMeter.label.3': 'Bom',
  'passwordStrengthMeter.label.4': 'Forte',
  'passwordStrengthMeter.ariaValueText':
    'Força da senha:<x> {{rótulo}}</x> (<x> {{pontuação}}</x> de 4)',
  'passwordStrengthMeter.rule.upper': 'Contém uma letra maiúscula',
  'passwordStrengthMeter.rule.lower': 'Contém uma letra minúscula',
  'passwordStrengthMeter.rule.digit': 'Contém um dígito',
  'passwordStrengthMeter.rule.symbol': 'Contém um símbolo',
  'passwordStrengthMeter.rule.noCommon': 'Senha incomum',
}
