/**
 * Form handling interface for molecule.dev.
 *
 * Provides a unified form management API that works across different
 * form libraries (native, React Hook Form, Formik, etc.).
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
