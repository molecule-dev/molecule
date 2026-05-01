/**
 * Translation keys for the password generator locale package.
 *
 * Keys are referenced from `@molecule/app-password-generator-react` via
 * `t('password-generator.<key>', …, { defaultValue })`.
 */
export type PasswordGeneratorTranslationKey =
  | 'password-generator.readoutLabel'
  | 'password-generator.copy'
  | 'password-generator.copied'
  | 'password-generator.regenerate'
  | 'password-generator.length'
  | 'password-generator.lengthLabel'
  | 'password-generator.toggle.uppercase'
  | 'password-generator.toggle.lowercase'
  | 'password-generator.toggle.digits'
  | 'password-generator.toggle.symbols'
  | 'password-generator.toggle.noSimilar'
  | 'password-generator.toggle.noAmbiguous'
  | 'password-generator.pick'

/** Translation record mapping password-generator keys to translated strings. */
export type PasswordGeneratorTranslations = Record<PasswordGeneratorTranslationKey, string>
