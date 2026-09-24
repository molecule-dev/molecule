/**
 * Form handling interface for molecule.dev.
 *
 * Provides a unified form management API that works across different
 * form libraries (native, React Hook Form, Formik, etc.).
 *
 * @example
 * ```typescript
 * import { createForm, nativeProvider, setProvider } from '@molecule/app-forms'
 * import { post } from '@molecule/app-http'
 * import { t } from '@molecule/app-i18n'
 *
 * setProvider(nativeProvider) // optional — createForm() auto-bonds the built-in native provider
 *
 * type Signup = { email: string; password: string } // a `type`, not an `interface`
 *
 * const form = createForm<Signup>({ defaultValues: { email: '', password: '' }, mode: 'onBlur' })
 * const required = t('forms.required', undefined, { defaultValue: 'This field is required' })
 * const email = form.register({ name: 'email', required, email: true })
 * const password = form.register({ name: 'password', required, minLength: 8 })
 *
 * // Wire value / onChange / onBlur to each <input> (React: `useForm` from `@molecule/app-react`).
 * email.onChange({ target: { name: 'email', value: 'ada@example' } })
 * password.onChange({ target: { name: 'password', value: 'correct-horse' } })
 *
 * const onSubmit = form.handleSubmit(
 *   async (values) => {
 *     await post('/signup', values) // relative path through the bonded HTTP client
 *   },
 *   (errors) => console.warn(errors), // { email: 'Invalid email address' } — nothing was posted
 * )
 * await onSubmit() // pass the submit event in a real <form onSubmit>
 *
 * form.setValue('email', 'ada@example.com')
 * await onSubmit() // valid → POST /signup { email, password }
 * console.log(form.getState().submitCount) // 2
 * ```
 *
 * @remarks
 * Build forms with {@link createForm} (or the framework hook), not a direct react-hook-form /
 * formik import — that couples you to one library and breaks the swap.
 *
 * - **Client validation is UX, NOT a security boundary.** {@link validateValue} / client rules
 *   give instant feedback, but the SERVER must re-validate every field it receives — a request
 *   can skip the form entirely (curl, a tampered client). Never trust a value because the
 *   client "validated" it, and never enforce authorization in the form.
 * - **`T` must be a `type` alias (or have an index signature)** — `createForm<T extends
 *   Record<string, unknown>>` rejects a plain `interface`.
 * - `handleSubmit(onValid, onInvalid)` returns the submit HANDLER; call it (or pass it as
 *   `onSubmit`) — `handleSubmit(...)` alone submits nothing. `onValid` runs only when every
 *   registered rule passes.
 * - The native provider's built-in rule messages (`email: true`, `minLength: 8`, …) are
 *   English only. For translated messages pass the message yourself:
 *   `required: t('forms.required', undefined, { defaultValue: '…' })`.
 * - Keep secrets out of any form state you persist (see `@molecule/app-storage`), and submit
 *   through the HTTP client (`@molecule/app-http`) with a relative path — never a hardcoded URL.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Typing into each field updates its displayed value — interact_preview
 *   into the field's data-mol-id, then read_preview_ui shows the new value in
 *   the input (no stuck/blank input, no lag behind what you typed).
 * - [ ] Submitting with a required field empty, a malformed email, or an
 *   out-of-range number BLOCKS submit and shows that field's own error message
 *   beside it — the handler does not run (no navigation, success state, or POST).
 * - [ ] Fixing the offending field clears its error, and once every field is
 *   valid the same submit succeeds — a valid submit passes the correct current
 *   values (confirm the request/next screen carries what you typed, not stale
 *   or blank data).
 * - [ ] Errors appear at the configured time, not before: with mode onBlur or
 *   onSubmit a pristine, untouched field shows NO error on first render — the
 *   error only surfaces after you blur/touch it or attempt submit. No field
 *   screams before the user has interacted.
 * - [ ] Cross-field / form-level rules fire (e.g. a confirm-password mismatch
 *   via the form-level validate) and block submit until satisfied, showing the
 *   message on the right field.
 * - [ ] If the form does async validation (e.g. a username-taken check), submit
 *   waits for it to resolve before running the handler, any pending/validating
 *   indicator shows while it is in flight, and an async failure blocks submit
 *   with its message.
 * - [ ] Resetting the form restores the initial default values in the inputs and
 *   clears every error and touched state — a previously-shown error is gone and
 *   the submit control returns to its initial enabled/disabled state.
 * - [ ] Dirty/touched tracking is observable: an unchanged form reads as pristine
 *   (no "unsaved changes" affordance; save disabled if the app gates on dirty),
 *   editing a field flips it to dirty, and an invalid submit focuses the first
 *   error field.
 *
 * @module
 */

export * from './controller.js'
export * from './provider.js'
export * from './types.js'
export * from './validation.js'
