/**
 * Form handling interface for molecule.dev.
 *
 * Provides a unified form management API that works across different
 * form libraries (native, React Hook Form, Formik, etc.).
 *
 * @example
 * ```typescript
 * import { createForm } from '@molecule/app-forms'
 * // (React apps: prefer the `useForm` hook from `@molecule/app-react` — same options.)
 *
 * const form = createForm<{ email: string; password: string }>({
 *   defaultValues: { email: '', password: '' },
 *   mode: 'onBlur',
 * })
 *
 * const email = form.register({
 *   name: 'email',
 *   required: t('forms.required', undefined, { defaultValue: 'This field is required' }),
 *   email: true,
 * })
 * // Wire email.value / email.onChange / email.onBlur to your input element.
 *
 * const onSubmit = form.handleSubmit(async (values) => {
 *   await http.post('/signup', values)   // relative path via the app HTTP client
 * })
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
 * - Keep secrets out of any form state you persist (see `@molecule/app-storage`), and submit
 *   through the HTTP client (`@molecule/app-http`) with a relative path — never a hardcoded URL.
 *
 * @module
 */

export * from './controller.js'
export * from './provider.js'
export * from './types.js'
export * from './validation.js'
