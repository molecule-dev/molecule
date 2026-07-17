import type { FooterTranslations } from './types.js'

/** Footer translations for English. */
export const en: FooterTranslations = {
  'footer.version': 'v{{version}}',
  'footer.about': 'About {{appName}}',
  'footer.privacyPolicy': 'Privacy Policy',
  'footer.termsOfService': 'Terms of Service',
  'footer.language': 'Language',
  'footer.legalNotConfigured':
    'This content has not been configured yet. The app owner must provide it.',
  // Legal HTML is app-supplied and intentionally EMPTY by default — a generic
  // default policy would be legally wrong to present as an app's own. The
  // footer renders `footer.legalNotConfigured` (never a blank modal) until the
  // app registers real content or wires `@molecule/app-locales-legal-default`.
  'content.privacyPolicy': '',
  'content.termsOfService': '',
}
