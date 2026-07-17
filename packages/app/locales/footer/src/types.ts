/** Translation keys for the footer locale package. */
export type FooterTranslationKey =
  | 'footer.version'
  | 'footer.about'
  | 'footer.privacyPolicy'
  | 'footer.termsOfService'
  | 'footer.language'
  | 'footer.legalNotConfigured'
  | 'content.privacyPolicy'
  | 'content.termsOfService'

/** Translation record mapping footer-react keys to translated strings. */
export type FooterTranslations = Record<FooterTranslationKey, string>
