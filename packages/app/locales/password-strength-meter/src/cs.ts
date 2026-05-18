import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for cs. */
export const cs: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Alespoň 12 znaků',
  'passwordStrengthMeter.label.0': 'Velmi slabý',
  'passwordStrengthMeter.label.1': 'Slabý',
  'passwordStrengthMeter.label.2': 'Veletrh',
  'passwordStrengthMeter.label.3': 'Dobrý',
  'passwordStrengthMeter.label.4': 'Silný',
  'passwordStrengthMeter.ariaValueText': 'Síla hesla:<x> {{označení}}</x> (<x> {{skóre}}</x> ze 4)',
  'passwordStrengthMeter.rule.upper': 'Obsahuje velké písmeno',
  'passwordStrengthMeter.rule.lower': 'Obsahuje malé písmeno',
  'passwordStrengthMeter.rule.digit': 'Obsahuje číslici',
  'passwordStrengthMeter.rule.symbol': 'Obsahuje symbol',
  'passwordStrengthMeter.rule.noCommon': 'Není to běžné heslo',
}
