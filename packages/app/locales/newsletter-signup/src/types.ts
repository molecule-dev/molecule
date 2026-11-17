/** Translation keys for the newsletter-signup locale package. */
export type NewsletterSignupTranslationKey =
  | 'newsletter.placeholder'
  | 'newsletter.subscribing'
  | 'newsletter.subscribe'
  | 'newsletter.label.email'
  | 'newsletter.error.subscriptionFailed'

/** Translation record mapping newsletter-signup-react keys to translated strings. */
export type NewsletterSignupTranslations = Record<NewsletterSignupTranslationKey, string>
