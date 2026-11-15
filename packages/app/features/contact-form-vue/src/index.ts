/**
 * Vue generic contact form (name + email + message + extras).
 *
 * Exports `<ContactForm>` and `ContactFormValues` type — the Vue counterpart of
 * `@molecule/app-contact-form-react`: the same props (React names) and the same
 * DOM for the same input, so an app switches framework by changing only the
 * package name in its imports.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { ContactForm } from '@molecule/app-contact-form-vue'
 *
 * const Contact = defineComponent({
 *   setup() {
 *     return () =>
 *       h(
 *         ContactForm,
 *         {
 *           title: 'Get in touch',
 *           description: "We'll respond within one business day.",
 *           onSubmit: async (values) => {
 *             await api.sendContactMessage(values)
 *           },
 *         },
 *         {
 *           successContent: () => [h('p', "Thanks! We'll be in touch soon.")],
 *         },
 *       )
 *   },
 * })
 *
 * createApp(Contact).mount('#app')
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
 * Node-valued props arrive as a prop AND a same-named slot
 * (`title`, `description`, `submitLabel`, `successContent`, `extraFields`);
 * components accept either.
 *
 * @module
 */

export * from './ContactForm.js'
export * from './types.js'
