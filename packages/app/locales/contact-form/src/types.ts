/** Translation keys for the contact-form locale package. */
export type ContactFormTranslationKey =
  | 'contactForm.name'
  | 'contactForm.email'
  | 'contactForm.message'
  | 'contactForm.sending'
  | 'contactForm.send'

/** Translation record mapping contact-form-react keys to translated strings. */
export type ContactFormTranslations = Record<ContactFormTranslationKey, string>
