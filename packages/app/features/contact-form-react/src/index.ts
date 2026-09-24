/**
 * Generic contact form (name + email + message + extras).
 *
 * Exports `<ContactForm>` and `ContactFormValues` type.
 *
 * @example
 * ```tsx
 * import { ContactForm, type ContactFormValues } from '@molecule/app-contact-form-react'
 * import { post } from '@molecule/app-http'
 *
 * export function ContactPage() {
 *   async function sendMessage(values: ContactFormValues): Promise<void> {
 *     await post('/contact', values) // rejects on non-2xx → message shown under the form
 *   }
 *   return (
 *     <ContactForm
 *       title="Get in touch"
 *       description="We'll respond within one business day."
 *       onSubmit={sendMessage}
 *       successContent={<p>Thanks! We'll be in touch soon.</p>}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - It does NOT send anything itself — `onSubmit` is REQUIRED and is where you call your API
 *   (through `@molecule/app-http`, not raw `fetch`). Return/await the Promise: the button is
 *   disabled ("Sending…") until it settles and a double submit is ignored.
 * - `onSubmit` receives ONLY `{ name, email, message }` — inputs rendered via the
 *   `extraFields` slot are displayed but NOT collected; own their state in the parent and merge
 *   them inside your `onSubmit`.
 * - Always pass `successContent`: without it the form clears silently after a successful submit
 *   with no user feedback. With it, the form is REPLACED by that content (no way back without
 *   remounting).
 * - If `onSubmit` throws, the thrown `Error.message` is shown verbatim below the form — throw
 *   translated, user-safe messages.
 * - It calls `useTranslation()` from `@molecule/app-react`, so it MUST render inside
 *   `<I18nProvider>` / `<MoleculeProvider>` (it throws otherwise); `getClassMap()` throws unless
 *   `setClassMap(classMap)` from `@molecule/app-ui` ran at startup; inputs/button come from
 *   `@molecule/app-ui-react` (a peer dependency).
 * - Placeholders/buttons use `contactForm.*` i18n keys (companion bond:
 *   `@molecule/app-locales-contact-form`). `title`, `description`, `submitLabel` and
 *   `successContent` are yours — pass translated text. The inputs' aria-labels ("Name",
 *   "Email", "Message") are fixed English.
 *
 * @module
 */

export * from './ContactForm.js'
