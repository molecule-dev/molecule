import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for fi. */
export const fi: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Vähintään 12 merkkiä',
  'passwordStrengthMeter.label.0': 'Hyvin heikko',
  'passwordStrengthMeter.label.1': 'Heikko',
  'passwordStrengthMeter.label.2': 'Reilu',
  'passwordStrengthMeter.label.3': 'Hyvä',
  'passwordStrengthMeter.label.4': 'Vahva',
  'passwordStrengthMeter.ariaValueText':
    'Salasanan vahvuus:<x> {{etiketti}}</x> (<x> {{pisteet}}</x> 4:stä)',
  'passwordStrengthMeter.rule.upper': 'Sisältää ison kirjaimen',
  'passwordStrengthMeter.rule.lower': 'Sisältää pienen kirjaimen',
  'passwordStrengthMeter.rule.digit': 'Sisältää numeron',
  'passwordStrengthMeter.rule.symbol': 'Sisältää symbolin',
  'passwordStrengthMeter.rule.noCommon': 'Ei yleinen salasana',
}
