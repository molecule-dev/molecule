/**
 * Svelte generic contact form — the Svelte counterpart of
 * `@molecule/app-contact-form-react`, with the same props and the same DOM for
 * the same input.
 *
 * Exports `<ContactForm>` and the `ContactFormValues` type: name + email +
 * message fields with submit handling and success state, plus an `extraFields`
 * slot for app-specific inputs.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { ContactForm } from '@molecule/app-contact-form-svelte'
 *
 *   async function send(values: { name: string; email: string; message: string }) {
 *     await api.sendContactMessage(values)
 *   }
 * </script>
 *
 * <ContactForm
 *   title="Get in touch"
 *   description="We'll respond within one business day."
 *   onSubmit={send}
 * >
 *   {#snippet successContent()}
 *     <p>Thanks! We'll be in touch soon.</p>
 *   {/snippet}
 * </ContactForm>
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond and `@molecule/app-svelte`'s i18n provider
 * above it — `getClassMap()` and `useTranslation()` both throw before wiring.
 * Pair with `@molecule/app-locales-contact-form` for the placeholder / button
 * strings in 79 languages.
 *
 * `onSubmit` receives ONLY `{ name, email, message }` — inputs rendered via the
 * `extraFields` snippet are displayed but NOT collected; own their state in the
 * parent and merge them inside your `onSubmit`. Always pass `successContent`:
 * without it the form clears silently after a successful submit. If `onSubmit`
 * rejects, the thrown `Error.message` is shown verbatim below the form — throw
 * translated, user-safe messages.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
