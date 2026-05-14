import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for Hungarian. */
export const hu: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': 'Nagyon gyenge',
  'passwordStrengthMeter.label.1': 'Gyenge',
  'passwordStrengthMeter.label.2': 'Megfelelő',
  'passwordStrengthMeter.label.3': 'Jó',
  'passwordStrengthMeter.label.4': 'Erős',
  'passwordStrengthMeter.ariaValueText': 'Jelszó erőssége: {{label}} ({{score}} / 4)',
  'passwordStrengthMeter.rule.length': 'Legalább 12 karakter',
  'passwordStrengthMeter.rule.upper': 'Tartalmaz nagybetűt',
  'passwordStrengthMeter.rule.lower': 'Tartalmaz kisbetűt',
  'passwordStrengthMeter.rule.digit': 'Tartalmaz számjegyet',
  'passwordStrengthMeter.rule.symbol': 'Tartalmaz szimbólumot',
  'passwordStrengthMeter.rule.noCommon': 'Nem gyakori jelszó',
}
