/**
 * Solid generic contact form (name + email + message + extras) — the Solid
 * counterpart of `@molecule/app-contact-form-react`, with the same props and
 * the same DOM for the same input.
 *
 * Exports `<ContactForm>` and the `ContactFormValues` type.
 *
 * @example
 * ```tsx
 * import { ContactForm } from '@molecule/app-contact-form-solid'
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
 * @remarks
 * `onSubmit` receives ONLY `{ name, email, message }` — inputs rendered via
 * the `extraFields` slot are displayed but NOT collected; own their state in
 * the parent and merge them inside your `onSubmit` (or a wrapping form).
 * Always pass `successContent`: without it the form clears silently after a
 * successful submit with no user feedback. If `onSubmit` throws, the thrown
 * `Error.message` is shown verbatim below the form — throw translated,
 * user-safe messages. Placeholders/buttons use `contactForm.*` i18n keys
 * (companion bond: `@molecule/app-locales-contact-form`).
 *
 * @module
 */

export * from './ContactForm.jsx'
export * from './types.js'
