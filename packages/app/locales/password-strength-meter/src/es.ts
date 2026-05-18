import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for es. */
export const es: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Al menos 12 caracteres',
  'passwordStrengthMeter.label.0': 'Muy débil',
  'passwordStrengthMeter.label.1': 'Débil',
  'passwordStrengthMeter.label.2': 'Justo',
  'passwordStrengthMeter.label.3': 'Bien',
  'passwordStrengthMeter.label.4': 'Fuerte',
  'passwordStrengthMeter.ariaValueText':
    'Seguridad de la contraseña:<x> {{etiqueta}}</x> (<x> {{puntaje}}</x> de 4)',
  'passwordStrengthMeter.rule.upper': 'Contiene una letra mayúscula',
  'passwordStrengthMeter.rule.lower': 'Contiene una letra minúscula',
  'passwordStrengthMeter.rule.digit': 'Contiene un dígito',
  'passwordStrengthMeter.rule.symbol': 'Contiene un símbolo',
  'passwordStrengthMeter.rule.noCommon': 'No es una contraseña común',
}
