import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for hu. */
export const hu: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Legalább 12 karakter',
  'passwordStrengthMeter.label.0': 'Nagyon gyenge',
  'passwordStrengthMeter.label.1': 'Gyenge',
  'passwordStrengthMeter.label.2': 'Igazságos',
  'passwordStrengthMeter.label.3': 'Jó',
  'passwordStrengthMeter.label.4': 'Erős',
  'passwordStrengthMeter.ariaValueText':
    'Jelszó erőssége:<x> {{címke}}</x> (<x> {{pontszám}}</x> 4-ből)',
  'passwordStrengthMeter.rule.upper': 'Nagybetűt tartalmaz',
  'passwordStrengthMeter.rule.lower': 'Kisbetűt tartalmaz',
  'passwordStrengthMeter.rule.digit': 'Tartalmaz egy számjegyet',
  'passwordStrengthMeter.rule.symbol': 'Tartalmaz egy szimbólumot',
  'passwordStrengthMeter.rule.noCommon': 'Nem gyakori jelszó',
}
