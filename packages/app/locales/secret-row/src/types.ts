/** Translation keys for the secret-row locale package. */
export type SecretRowTranslationKey =
  | 'secretRow.expired'
  | 'secretRow.rotateIn'
  | 'secretRow.lastRotated'
  | 'secretRow.hide'
  | 'secretRow.show'
  | 'secretRow.copied'
  | 'secretRow.copy'
  | 'secretRow.rotate'
  | 'secretRow.delete'

/** Translation record mapping secret-row-react keys to translated strings. */
export type SecretRowTranslations = Record<SecretRowTranslationKey, string>
