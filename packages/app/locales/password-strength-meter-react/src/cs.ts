import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for Czech. */
export const cs: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': 'Velmi slabé',
  'passwordStrengthMeter.label.1': 'Slabé',
  'passwordStrengthMeter.label.2': 'Průměrné',
  'passwordStrengthMeter.label.3': 'Dobré',
  'passwordStrengthMeter.label.4': 'Silné',
  'passwordStrengthMeter.ariaValueText': 'Síla hesla: {{label}} ({{score}} ze 4)',
  'passwordStrengthMeter.rule.length': 'Alespoň 12 znaků',
  'passwordStrengthMeter.rule.upper': 'Obsahuje velké písmeno',
  'passwordStrengthMeter.rule.lower': 'Obsahuje malé písmeno',
  'passwordStrengthMeter.rule.digit': 'Obsahuje číslici',
  'passwordStrengthMeter.rule.symbol': 'Obsahuje symbol',
  'passwordStrengthMeter.rule.noCommon': 'Není běžné heslo',
}
