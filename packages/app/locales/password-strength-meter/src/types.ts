/**
 * Translation keys provided by the password-strength-meter locale bond.
 *
 * Keep in sync with the keys passed to `t()` inside
 * `@molecule/app-password-strength-meter-react`.
 */
export type PasswordStrengthMeterTranslationKey =
  | 'passwordStrengthMeter.label.0'
  | 'passwordStrengthMeter.label.1'
  | 'passwordStrengthMeter.label.2'
  | 'passwordStrengthMeter.label.3'
  | 'passwordStrengthMeter.label.4'
  | 'passwordStrengthMeter.ariaValueText'
  | 'passwordStrengthMeter.rule.length'
  | 'passwordStrengthMeter.rule.upper'
  | 'passwordStrengthMeter.rule.lower'
  | 'passwordStrengthMeter.rule.digit'
  | 'passwordStrengthMeter.rule.symbol'
  | 'passwordStrengthMeter.rule.noCommon'

/** Map of password-strength-meter keys to translated strings. */
export type PasswordStrengthMeterTranslations = Record<PasswordStrengthMeterTranslationKey, string>
