/**
 * Generic contact form (name + email + message + extras).
 *
 * Exports `<ContactForm>` and `ContactFormValues` type.
 *
 * @example
 * ```tsx
 * import { ContactForm } from '@molecule/app-contact-form-react'
 *
 * <ContactForm
 *   title="Get in touch"
 *   description="We'll respond within one business day."
 *   onSubmit={async (values) => {
 *     await api.sendContactMessage(values)
 *   }}
 *   successContent={<p>Thanks! We'll be in touch soon.</p>}
 * />
 * ```
 *
 * @module
 */

export * from './ContactForm.js'
