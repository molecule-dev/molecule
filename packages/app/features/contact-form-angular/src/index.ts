/**
 * Angular generic contact form — the counterpart of
 * `@molecule/app-contact-form-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<ContactForm>` and the `ContactFormValues` type: name + email +
 * message fields with submit handling and success state, plus an `extraFields`
 * slot for app-specific inputs.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { ContactForm } from '@molecule/app-contact-form-angular'
 *
 * @Component({
 *   selector: 'app-contact',
 *   standalone: true,
 *   imports: [ContactForm],
 *   template: `
 *     <mol-contact-form
 *       title="Get in touch"
 *       description="We'll respond within one business day."
 *       [onSubmit]="send"
 *     >
 *       <ng-template #success>
 *         <p>Thanks! We'll be in touch soon.</p>
 *       </ng-template>
 *     </mol-contact-form>
 *   `,
 * })
 * export class Contact {
 *   send = (values: Record<string, string>): Promise<void> => api.sendContactMessage(values)
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond and `@molecule/app-angular`'s i18n provider
 * above it — `getClassMap()` and `useTranslation()` both throw before wiring.
 * Pair with `@molecule/app-locales-contact-form` for the placeholder / button
 * strings in 79 languages.
 *
 * `onSubmit` receives ONLY `{ name, email, message }` — inputs rendered via the
 * `[slot=extraFields]` projection are displayed but NOT collected; own their
 * state in the parent and merge them inside your `onSubmit`. Always pass
 * `successContent`: without it the form clears silently after a successful
 * submit. If `onSubmit` throws, the thrown `Error.message` is shown verbatim
 * below the form — throw translated, user-safe messages.
 *
 * Node props are `TemplateRef`s or strings; `title`, `description` and
 * `extraFields` may also be projected as `[slot=title]`, `[slot=description]`
 * and `[slot=extraFields]` content.
 *
 * @module
 */

export * from './contact-form.component.js'
export * from './types.js'
