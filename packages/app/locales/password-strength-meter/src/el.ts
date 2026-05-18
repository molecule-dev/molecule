import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for el. */
export const el: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Τουλάχιστον 12 χαρακτήρες',
  'passwordStrengthMeter.label.0': 'Πολύ αδύναμο',
  'passwordStrengthMeter.label.1': 'Αδύναμος',
  'passwordStrengthMeter.label.2': 'Εκθεση',
  'passwordStrengthMeter.label.3': 'Καλός',
  'passwordStrengthMeter.label.4': 'Ισχυρός',
  'passwordStrengthMeter.ariaValueText':
    'Ισχύς κωδικού πρόσβασης:<x> {{επιγραφή}}</x> (<x> {{σκορ}}</x> από 4)',
  'passwordStrengthMeter.rule.upper': 'Περιέχει ένα κεφαλαίο γράμμα',
  'passwordStrengthMeter.rule.lower': 'Περιέχει ένα πεζό γράμμα',
  'passwordStrengthMeter.rule.digit': 'Περιέχει ένα ψηφίο',
  'passwordStrengthMeter.rule.symbol': 'Περιέχει ένα σύμβολο',
  'passwordStrengthMeter.rule.noCommon': 'Δεν είναι ένας συνηθισμένος κωδικός πρόσβασης',
}
